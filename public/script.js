const $ = (id) => document.getElementById(id);

const groups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

document.querySelectorAll("[data-groups]").forEach((select) => {
  groups.forEach((group) => {
    select.add(new Option(group, group));
  });
});

const titles = {
  overview: "Overview",
  inventory: "Blood inventory",
  requests: "Blood requests",
  deliveries: "Deliveries",
  workflow: "Multi-DB workflow",
};

function showPage(page) {
  if (!titles[page]) return;

  document.querySelectorAll(".page").forEach((el) => {
    el.classList.toggle("active", el.id === `page-${page}`);
  });

  document.querySelectorAll(".nav-link").forEach((el) => {
    el.classList.toggle("active", el.dataset.page === page);
  });

  $("breadcrumb").textContent = titles[page];
  $("sidebar").classList.remove("open");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.querySelectorAll("[data-page], [data-goto]").forEach((el) => {
  el.addEventListener("click", () => {
    showPage(el.dataset.page || el.dataset.goto);
  });
});

$("menu-toggle").addEventListener("click", () => {
  $("sidebar").classList.toggle("open");
});

function element(tag, className, text) {
  const node = document.createElement(tag);

  if (className) node.className = className;

  if (text !== undefined && text !== null) {
    node.textContent = String(text);
  }

  return node;
}

function message(target, kind, title, rows = []) {
  const host = $(target);
  host.replaceChildren();

  const box = element("div", `result-message ${kind}`);
  box.append(element("strong", "", title));

  if (rows.length) {
    const details = element("div", "details");

    rows.forEach(([key, value]) => {
      const row = element("div", "detail");

      row.append(element("span", "", key), element("span", "", value ?? "N/A"));

      details.append(row);
    });

    box.append(details);
  }

  host.append(box);
}

function value(id) {
  return $(id).value.trim();
}

async function post(path, payload, target, render, button) {
  const original = button?.textContent;

  if (button) {
    button.disabled = true;
    button.textContent = "Processing…";
  }

  message(target, "loading", "Connecting to HealthLink…");

  try {
    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed (${response.status})`);
    }

    render(data);
  } catch (error) {
    message(target, "error", error.message || "Operation failed");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = original;
    }
  }
}

function bindForm(formId, handler) {
  $(formId).addEventListener("submit", (event) => {
    event.preventDefault();
    handler(event.submitter);
  });
}

// ADD BLOOD UNIT

bindForm("form-add", (button) => {
  if (new Date(value("expiry_date")) <= new Date(value("collection_date"))) {
    message(
      "add_unit_result",
      "error",
      "Expiry date must be later than collection date",
    );
    return;
  }

  post(
    "/api/add-blood-unit",
    {
      unit_id: value("add_unit_id"),
      center_id: value("add_center_id"),
      blood_group: value("add_blood_group"),
      collection_date: value("collection_date"),
      expiry_date: value("expiry_date"),
      status: value("add_status"),
    },
    "add_unit_result",
    (data) => {
      message(
        "add_unit_result",
        "success",
        data.message || "Blood unit added",
        [
          ["Unit ID", data.blood_unit?.UNIT_ID],
          ["Center ID", data.blood_unit?.CENTER_ID],
          ["Blood group", data.blood_unit?.BLOOD_GROUP],
          ["Status", data.blood_unit?.STATUS],
        ],
      );
    },
    button,
  );
});

// CHECK AVAILABLE UNITS

bindForm("form-available", (button) => {
  post(
    "/api/available-units",
    {
      center_id: value("stock_center_id"),
      blood_group: value("blood_group"),
    },
    "available_result",
    (data) => {
      message("available_result", "success", "Stock lookup complete", [
        [`${value("blood_group")} units available`, data.available_units],
      ]);
    },
    button,
  );
});

// RESERVE BLOOD UNIT

bindForm("form-reserve", (button) => {
  post(
    "/api/reserve-unit",
    {
      unit_id: value("reserve_unit_id"),
    },
    "reserve_result",
    (data) => {
      message("reserve_result", "success", data.message || "Unit reserved", [
        ["Unit ID", data.blood_unit?.UNIT_ID],
        ["Blood group", data.blood_unit?.BLOOD_GROUP],
        ["Status", data.blood_unit?.STATUS],
      ]);
    },
    button,
  );
});

// CHECK REQUEST

$("check-request").addEventListener("click", (event) => {
  if (!$("request_operation_id").reportValidity()) return;

  post(
    "/api/check-request",
    {
      request_id: value("request_operation_id"),
    },
    "request_result",
    (data) => {
      message(
        "request_result",
        data.can_fulfill ? "success" : "warning",
        data.can_fulfill
          ? "Request can be fulfilled"
          : "Request cannot be fulfilled",
        [["Request ID", value("request_operation_id")]],
      );
    },
    event.currentTarget,
  );
});

// PROCESS REQUEST

$("process-request").addEventListener("click", (event) => {
  if (!$("request_operation_id").reportValidity()) return;

  post(
    "/api/process-request",
    {
      request_id: value("request_operation_id"),
    },
    "request_result",
    (data) => {
      message("request_result", "success", "Request processed", [
        ["Request ID", data.request?.REQUEST_ID],
        ["Status", data.request?.STATUS],
        ["Audit action", data.audit?.ACTION_TYPE],
        ["Audit user", data.audit?.USER_NAME],
      ]);
    },
    event.currentTarget,
  );
});

// CREATE DELIVERY

bindForm("form-delivery", (button) => {
  post(
    "/api/create-delivery",
    {
      delivery_id: value("delivery_id"),
      center_id: value("delivery_center_id"),
      request_id: value("delivery_request_id"),
    },
    "delivery_result",
    (data) => {
      message(
        "delivery_result",
        "success",
        data.message || "Delivery created",
        [
          ["Delivery ID", data.delivery?.DELIVERY_ID],
          ["Request ID", data.delivery?.REQUEST_ID],
          ["Status", data.delivery?.DELIVERY_STATUS],
        ],
      );
    },
    button,
  );
});

// MULTI-DATABASE WORKFLOW DISPLAY

function detail(container, label, val) {
  const row = element("div", "detail");

  row.append(element("span", "", label), element("span", "", val ?? "N/A"));

  container.append(row);
}

function workflowCard(title) {
  const card = element("article", "workflow-card");
  card.append(element("h3", "", title));
  return card;
}

function section(card, title) {
  card.append(element("h4", "", title));
}

function renderWorkflow(data) {
  const host = $("result");
  host.replaceChildren();

  const grid = element("div", "workflow-cards");

  // MONGODB
  const mongo = workflowCard("◉ MongoDB");

  section(mongo, "Blood unit profile");

  detail(mongo, "Unit ID", data.mongo?.profile?.unit_id);
  detail(mongo, "Donor notes", data.mongo?.profile?.donor_notes);

  section(mongo, "Cold chain");

  const chain = data.mongo?.coldChain;
  const readings = Array.isArray(chain?.readings) ? chain.readings : [];

  const latest = readings.at(-1);

  detail(mongo, "Sensor", chain?.sensor_id);

  detail(
    mongo,
    "Temperature",
    latest?.temperature == null ? "N/A" : `${latest.temperature} °C`,
  );

  detail(
    mongo,
    "Humidity",
    latest?.humidity == null ? "N/A" : `${latest.humidity}%`,
  );

  detail(mongo, "Alert", chain?.alerts?.[0]?.message || "No alerts");

  // NEO4J
  const neo = workflowCard("⬡ Neo4j");

  section(neo, "Delivery route");

  const route = Array.isArray(data.neo4j?.route) ? data.neo4j.route : [];

  if (route.length) {
    route.forEach((stop, index) => {
      if (index) {
        neo.append(element("div", "route-arrow", "↓"));
      }

      neo.append(element("div", "route-stop", stop));
    });
  } else {
    neo.append(element("p", "", "No route returned"));
  }

  detail(
    neo,
    "Total distance",
    data.neo4j?.distance_km == null ? "N/A" : `${data.neo4j.distance_km} km`,
  );

  // ORACLE
  const oracle = workflowCard("▦ Oracle");

  section(oracle, "Blood request");

  const req = data.oracle?.request;

  detail(oracle, "Request ID", req?.REQUEST_ID);
  detail(oracle, "Hospital ID", req?.HOSPITAL_ID);
  detail(oracle, "Priority", req?.PRIORITY);
  detail(oracle, "Status", req?.STATUS);

  section(oracle, "Audit log");

  const audit = data.oracle?.auditLog?.[0];

  detail(oracle, "Action", audit?.ACTION_TYPE);
  detail(oracle, "User", audit?.USER_NAME);
  detail(oracle, "Details", audit?.DETAILS);

  grid.append(mongo, neo, oracle);
  host.append(grid);
}

// RUN COMPLETE WORKFLOW

bindForm("form-workflow", (button) => {
  post(
    "/api/workflow",
    {
      unit_id: value("unit_id"),
      center_id: value("center_id"),
      hospital_id: value("hospital_id"),
      request_id: value("request_id"),
    },
    "result",
    renderWorkflow,
    button,
  );
});
