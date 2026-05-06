const express = require("express");
const { Pool } = require("pg");

const app = express();
const port = process.env.PORT || 3000;

const db = new Pool({
  host: process.env.DB_HOST || "postgres",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "production_tracker",
  user: process.env.DB_USER || "tracker_user",
  password: process.env.DB_PASSWORD || "tracker_pass"
});

const sources = ["HELLER", "KIC"];
const statuses = ["INFO", "WARNING", "CRITICAL"];
const eventTypes = [
  "BATCH_STARTED",
  "BATCH_COMPLETED",
  "TEMPERATURE_READING",
  "ALARM",
  "MAINTENANCE"
];

app.use(express.json());

function log(level, message, data = {}) {
  console.log(JSON.stringify({
    time: new Date().toISOString(),
    level,
    message,
    ...data
  }));
}

function checkEvent(body) {
  const errors = [];
  const event = {
    source: String(body.source || "").trim().toUpperCase(),
    lineId: String(body.lineId || "").trim(),
    ovenId: String(body.ovenId || "").trim(),
    eventType: String(body.eventType || "").trim().toUpperCase(),
    status: String(body.status || "INFO").trim().toUpperCase(),
    temperatureC: body.temperatureC === undefined ? null : Number(body.temperatureC),
    description: String(body.description || "").trim(),
    occurredAt: body.occurredAt ? new Date(body.occurredAt) : new Date()
  };

  if (!sources.includes(event.source)) errors.push("source deve ser HELLER ou KIC");
  if (!event.lineId) errors.push("lineId e obrigatorio");
  if (!event.ovenId) errors.push("ovenId e obrigatorio");
  if (!eventTypes.includes(event.eventType)) errors.push("eventType invalido");
  if (!statuses.includes(event.status)) errors.push("status deve ser INFO, WARNING ou CRITICAL");
  if (event.temperatureC !== null && Number.isNaN(event.temperatureC)) errors.push("temperatureC deve ser numero");
  if (Number.isNaN(event.occurredAt.getTime())) errors.push("occurredAt invalido");

  return { event, errors };
}

function mapEvent(row) {
  return {
    id: row.id,
    source: row.source,
    lineId: row.line_id,
    ovenId: row.oven_id,
    eventType: row.event_type,
    status: row.status,
    temperatureC: row.temperature_c === null ? null : Number(row.temperature_c),
    description: row.description,
    occurredAt: row.occurred_at,
    createdAt: row.created_at
  };
}

app.get("/health", async (_req, res) => {
  try {
    await db.query("select 1");
    res.json({ status: "healthy" });
  } catch (error) {
    log("ERROR", "healthcheck_failed", { error: error.message });
    res.status(503).json({ status: "unhealthy" });
  }
});

app.post("/api/events", async (req, res) => {
  const { event, errors } = checkEvent(req.body || {});

  if (errors.length > 0) {
    log("WARN", "event_rejected", { errors });
    res.status(400).json({ errors });
    return;
  }

  try {
    const result = await db.query(
      `insert into production_events
        (source, line_id, oven_id, event_type, status, temperature_c, description, occurred_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning *`,
      [
        event.source,
        event.lineId,
        event.ovenId,
        event.eventType,
        event.status,
        event.temperatureC,
        event.description,
        event.occurredAt
      ]
    );

    const saved = mapEvent(result.rows[0]);
    log("INFO", "event_saved", {
      id: saved.id,
      source: saved.source,
      lineId: saved.lineId,
      status: saved.status
    });

    res.status(201).json(saved);
  } catch (error) {
    log("ERROR", "event_save_error", { error: error.message });
    res.status(500).json({ error: "erro ao salvar evento" });
  }
});

app.get("/api/events", async (req, res) => {
  const limit = Math.min(Number(req.query.limit || 20), 50);

  try {
    const result = await db.query(
      `select *
       from production_events
       order by occurred_at desc
       limit $1`,
      [limit]
    );

    res.json(result.rows.map(mapEvent));
  } catch (error) {
    log("ERROR", "event_list_error", { error: error.message });
    res.status(500).json({ error: "erro ao listar eventos" });
  }
});

app.get("/api/monitor", async (_req, res) => {
  try {
    const total = await db.query("select count(*)::int as total from production_events");
    const byStatus = await db.query(
      "select status, count(*)::int as total from production_events group by status order by status"
    );
    const lastEvents = await db.query(
      "select * from production_events order by occurred_at desc limit 5"
    );

    res.json({
      totalEvents: total.rows[0].total,
      byStatus: byStatus.rows,
      lastEvents: lastEvents.rows.map(mapEvent)
    });
  } catch (error) {
    log("ERROR", "monitor_error", { error: error.message });
    res.status(500).json({ error: "erro ao montar monitoramento" });
  }
});

app.listen(port, "0.0.0.0", () => {
  log("INFO", "api_started", { port });
});
