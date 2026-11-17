
# HealthLink | Blood Supply Management System

A full-stack, multi-database application designed to manage blood inventory, hospital blood requests, and delivery operations.

HealthLink integrates **Oracle Database, MongoDB, and Neo4j** through a **Node.js and Express.js backend**, providing a centralized healthcare management dashboard.

The project demonstrates relational, document-oriented, and graph database technologies working together within a single application.

> **Project Status:** Completed academic project, developed for educational and portfolio purposes. Not intended for clinical or production use.

---

## Project Overview

HealthLink is a blood supply management system that demonstrates how multiple database technologies can be integrated to support different data management requirements.

The application manages blood inventory, hospital requests, and deliveries while incorporating document-based monitoring information and graph-based logistics.

Each database has a specific responsibility:

| Database | Responsibility |
|----------|----------------|
| **Oracle Database** | Transactional operations, structured records, and business logic |
| **MongoDB** | Blood unit profiles and cold-chain monitoring records |
| **Neo4j** | Blood supply network relationships and delivery route analysis |

The Express.js backend connects these databases and exposes REST API endpoints consumed by the frontend.

An ETL process synchronizes selected data from Oracle into MongoDB and Neo4j.

---

## Technology Stack

### Frontend
- HTML5
- CSS3
- JavaScript (ES6+)
- Responsive dashboard interface
- Fetch API

### Backend
- Node.js
- Express.js 5
- RESTful APIs
- JavaScript ES Modules
- dotenv

### Databases
- Oracle Database 19c
- Oracle SQL and PL/SQL
- MongoDB
- Neo4j
- Cypher Query Language
- Neo4j Graph Data Science (GDS)

### Database Drivers
- `oracledb`
- `mongodb`
- `neo4j-driver`

---

## System Architecture

HealthLink follows a client-server architecture with three database technologies.

```text
                  HEALTHLINK
              Web-Based Dashboard
                HTML / CSS / JS
                       |
                       |
                 REST API Calls
                       |
                       v
              Node.js + Express.js
                       |
          +------------+------------+
          |            |            |
          v            v            v
       ORACLE       MONGODB        NEO4J
       Database     Database       Graph
          |            |            |
     Transactions   Documents    Relationships
     PL/SQL Logic   Cold Chain   Delivery Routes
     Audit Logs     Profiles     Graph Analysis
```

### Oracle Database

Oracle acts as the primary transactional database.

It manages:
- Blood centers
- Hospitals
- Blood inventory
- Hospital blood requests
- Request details
- Deliveries
- Audit records

Oracle provides relational integrity through primary keys, foreign keys, check constraints, and PL/SQL business rules.

### MongoDB

MongoDB stores flexible document-based information.

Its responsibilities include:
- Blood unit profiles
- Donor notes
- Cold-chain monitoring records
- Temperature readings
- Humidity readings
- Monitoring alerts

### Neo4j

Neo4j models the blood supply network as a graph.

It supports:
- Blood center nodes
- Hospital nodes
- Logistics relationships
- Delivery route queries
- Graph traversal and route analysis

---

## Features

### 1. Blood Inventory Management

- Register new blood units.
- Assign units to blood centers.
- Store blood groups and collection dates.
- Track expiration dates.
- Check available inventory.
- Reserve available blood units.
- Validate inventory operations through Oracle PL/SQL.

### 2. Hospital Blood Request Processing

- Check whether blood requests can be fulfilled.
- Process hospital requests.
- Approve or reject requests based on available inventory.
- Execute Oracle stored procedures and functions.
- Record request processing actions in an audit log.

### 3. Delivery Management

- Create delivery records.
- Associate deliveries with blood centers.
- Link deliveries to hospital blood requests.
- Validate that requests are approved before creating deliveries.
- Track delivery statuses.

### 4. MongoDB Integration

- Retrieve blood unit profiles.
- Access donor notes.
- Retrieve cold-chain monitoring information.
- Display temperature and humidity readings.
- Display monitoring alerts when available.

### 5. Neo4j Integration

- Represent blood centers and hospitals as graph nodes.
- Model logistics relationships.
- Query routes between supply network locations.
- Retrieve route information and distances.
- Use graph algorithms for route-related analysis.

### 6. Multi-Database Workflow

HealthLink includes an integrated workflow that combines data from all three databases.

The workflow:

1. Retrieves blood unit profile information from MongoDB.
2. Retrieves cold-chain monitoring data.
3. Queries delivery route information from Neo4j.
4. Processes a hospital blood request using Oracle.
5. Retrieves updated request information and audit records.
6. Displays the results in the dashboard.

**Note:** The workflow coordinates database operations at the application level. It does not implement a distributed ACID transaction across Oracle, MongoDB, and Neo4j.

### 7. Healthcare Dashboard

The application provides a responsive web interface with five main sections:

- **Overview:** Application introduction and quick actions.
- **Blood Inventory:** Add, check, and reserve blood units.
- **Blood Requests:** Check fulfillment and process requests.
- **Deliveries:** Create delivery records.
- **Multi-Database Workflow:** View Oracle, MongoDB, and Neo4j results together.

The interface includes form validation, loading indicators, operation feedback, and responsive navigation.

---

## Oracle Database Design

The relational database consists of nine main tables:

| Table | Description |
|-------|-------------|
| `BLOOD_CENTER` | Stores blood center information |
| `BLOOD_UNIT` | Stores individual blood units |
| `BLOOD_CENTER_PHONE` | Stores blood center phone numbers |
| `HOSPITAL` | Stores hospital information |
| `HOSPITAL_PHONE` | Stores hospital phone numbers |
| `BLOOD_REQUEST` | Stores hospital blood requests |
| `REQUEST_DETAIL` | Stores requested blood groups and quantities |
| `DELIVERY` | Stores delivery information |
| `AUDIT_LOG` | Records request processing actions |

### Database Programming Components

The Oracle implementation includes:

**Stored Procedure**
- `Reserve_Blood_Unit`

**Stored Function**
- `Get_Available_Units`

**Triggers**
- `Validate_Blood_Unit_Status_trig`
- `Validate_Delivery_Request_trig`
- `Blood_Request_Delete_Prevention_trig`

**PL/SQL Package**
- `Blood_Request_Package`
  - `Can_Fullfill_Request`
  - `Process_Request`

**Views**
- `Blood_Center_Contact_View`
- `Hospital_Contact_View`

**Materialized View**
- `Available_Blood_Stock_MV`

These objects demonstrate database constraints, business rule enforcement, procedural programming, auditing, and transaction processing.

---

## Project Structure

```text
HealthLink/
|
|-- db/
|   |-- oracle.js
|   |-- mongo.js
|   |-- neo4j.js
|
|-- public/
|   |-- index.html
|   |-- style.css
|   |-- script.js
|
|-- automated-tests.js
|-- etl.js
|-- server.js
|-- package.json
|-- package-lock.json
|-- .env.example
|-- .gitignore
|-- README.md
```

The `.env` file and `node_modules` directory are excluded from version control.

---

## Installation and Setup

### Prerequisites

Install and configure:

- Node.js and npm
- Oracle Database
- MongoDB
- Neo4j
- Neo4j Graph Data Science plugin

The required databases and sample data must be prepared before running the application.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd HealthLink
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file using `.env.example` as a reference.

```dotenv
PORT=5000

# Oracle Database
ORACLE_USER=your_oracle_username
ORACLE_PASSWORD=your_oracle_password
ORACLE_CONNECTION=localhost:1521/HEALTHLINK_FINAL

# MongoDB
MONGO_URL=mongodb://localhost:27017
MONGO_DB=healthlink

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_neo4j_password
```

Replace the example values with your actual database configuration.

**Security:** Never commit `.env` files or database passwords to GitHub.

### 4. Prepare the Databases

Ensure that:

- Oracle contains the HealthLink schema and PL/SQL objects.
- MongoDB is running and accessible.
- Neo4j is running and contains the required graph data.
- The Neo4j Graph Data Science plugin is configured.

Database schema initialization is not fully automated.

### 5. Run ETL Synchronization

```bash
node etl.js
```

The ETL script synchronizes selected Oracle records into MongoDB and Neo4j.

This is a manually executed synchronization process rather than continuous real-time replication.

### 6. Start the Server

```bash
node server.js
```

### 7. Open the Application

Visit:

http://localhost:5000

---

## REST API Endpoints

The backend exposes seven API endpoints.

All endpoints use the `POST` method.

| Endpoint | Description |
|----------|-------------|
| `/api/add-blood-unit` | Register a blood unit |
| `/api/available-units` | Retrieve available blood stock |
| `/api/reserve-unit` | Reserve a blood unit |
| `/api/check-request` | Check request fulfillment |
| `/api/process-request` | Process a hospital request |
| `/api/create-delivery` | Create a delivery |
| `/api/workflow` | Execute the multi-database workflow |

### Example API Request

Check the available A+ blood units at blood center 1:

```bash
curl -X POST http://localhost:5000/api/available-units \
  -H "Content-Type: application/json" \
  -d '{"center_id":1,"blood_group":"A+"}'
```

The API returns the available unit count retrieved from Oracle.

---

## Automated Testing

HealthLink includes an automated API testing script.

### Running Tests

Start the application server:

```bash
node server.js
```

Open another terminal and execute:

```bash
node automated-tests.js
```

### Test Coverage

The existing automated tests cover:

1. Available blood unit lookup.
2. Request fulfillment checking.
3. Invalid blood unit reservation.
4. Delivery validation.
5. Integrated multi-database workflow.

The tests require a running backend and appropriate database records.

Some operations modify database data, so tests should be executed using disposable development records.

---

## Database Consistency

HealthLink demonstrates different data management approaches.

### Oracle: ACID

Oracle is used for transactional operations requiring consistency and integrity.

Its database objects enforce business rules and support transaction processing.

### MongoDB: Document-Oriented Storage

MongoDB provides flexible storage for records with nested or variable structures.

### Neo4j: Graph-Oriented Storage

Neo4j represents interconnected entities and supports relationship traversal and graph analysis.

### Integration Considerations

The application combines these technologies through an Express backend.

ETL synchronization introduces the possibility of differences between Oracle records and their synchronized representations.

The application does not provide atomic transactions across all three databases.

---

## Current Limitations

- Database initialization requires manual setup.
- ETL synchronization is not continuous.
- Automated tests depend on specific database records.
- Cross-database transactions are not atomic.
- Authentication and role-based access control are not implemented.
- Inventory allocation tracking is limited.
- The application is intended for educational demonstration rather than clinical deployment.

---

## Future Improvements

Potential improvements include:

- Real-time inventory statistics.
- Searchable blood inventory tables.
- Hospital request history.
- Improved blood unit allocation tracking.
- Automated ETL synchronization.
- Authentication and role-based access control.
- Enhanced validation and error handling.
- More comprehensive automated testing.
- Automated database initialization.

---

## Project Purpose

HealthLink was developed as a Database Programming project to explore the integration of multiple database architectures.

The project demonstrates practical experience with:

- Relational database design and normalization.
- Oracle SQL and PL/SQL programming.
- Stored procedures, functions, triggers, and packages.
- Document-oriented data modeling.
- Graph database modeling and Cypher queries.
- REST API development.
- Multi-database integration.
- ETL processes.
- Frontend and backend development.
- Automated API testing.

The application serves as an academic portfolio project demonstrating database programming and full-stack development concepts.