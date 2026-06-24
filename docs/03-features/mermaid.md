# Mermaid Diagrams in mdsvr

mdsvr supports **Mermaid.js** for creating beautiful diagrams directly in your Markdown files. Simply wrap your Mermaid code in triple backticks with the `mermaid` language identifier, and mdsvr will render it as an interactive diagram.

## Quick Start

```mermaid
flowchart LR
    A[Write Markdown] --> B[Add Mermaid Code]
    B --> C[mdsvr Renders]
    C --> D[Beautiful Diagram]
```

**Syntax:** All Mermaid diagrams start with a diagram type keyword, followed by the content.

```mermaid
flowchart TD
    A[Diagram Type] --> B[Content]
    B --> C[End]
```

**Comments:** Use `%%` to add comments that won't be rendered.

---

## Supported Diagram Types

mdsvr supports all 19 Mermaid diagram types. Below is a complete showcase with practical examples.

---

## 1. Flowchart

**Best for:** Process flows, workflows, decision trees, algorithms.

### Example: User Authentication Flow

```mermaid
flowchart TD
    A["User visits site"] --> B{"Logged in?"}
    B -->|"Yes"| C["Show dashboard"]
    B -->|"No"| D["Show login form"]
    D --> E{"Valid credentials?"}
    E -->|"Yes"| F["Create session"]
    E -->|"No"| G["Show error"]
    F --> C
    G --> D

    subgraph Auth["Authentication System"]
        D
        E
        F
        G
    end
```

### Syntax Guide

**Directions:** `TD` (top-down), `LR` (left-right), `BT` (bottom-up), `RL` (right-left)

**Node shapes:**

- `A["Text"]` - Rectangle
- `B("Text")` - Rounded
- `C{"Text"}` - Diamond (decision)
- `D(("Text"))` - Circle
- `E(["Text"])` - Stadium

**Arrows:** `-->` (arrow), `---` (line), `-.->` (dotted), `==>` (thick)

**Labels:** `A -->|"label"| B`

---

## 2. Sequence Diagram

**Best for:** API documentation, authentication flows, message exchanges between systems.

### Example: API Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant Browser
    participant API as "API Server"
    participant DB as "Database"

    User->>Browser: Enter credentials
    Browser->>+API: POST /auth/login
    API->>+DB: Query user
    DB-->>-API: User data
    alt Valid credentials
        API-->>-Browser: JWT token
        Browser-->>User: Redirect to dashboard
    else Invalid
        API-->>Browser: 401 error
        Browser-->>User: Show error message
    end
```

### Syntax Guide

**Participants:** `participant Name as "Display Name"`

**Arrows:**

- `->>` - Solid (request)
- `-->>` - Dashed (response)
- `->>+` - Activate
- `-->>-` - Deactivate

**Blocks:** `loop`, `alt/else`, `opt`, `par/and`, `critical`

---

## 3. Class Diagram

**Best for:** Software architecture, OOP structure, data models.

### Example: E-commerce System

```mermaid
classDiagram
    class User {
        +int id
        +string email
        +string name
        +login() bool
        +logout() void
    }

    class Order {
        +int id
        +float total
        +string status
        +addItem() void
        +checkout() void
    }

    class Product {
        +int id
        +string name
        +float price
        +int stock
    }

    User "1" --> "*" Order : places
    Order "*" --> "*" Product : contains
```

### Syntax Guide

**Visibility:** `+` (public), `-` (private), `#` (protected), `~` (package)

**Relationships:**

- `<|--` - Inheritance
- `*--` - Composition
- `o--` - Aggregation
- `-->` - Association

**Cardinality:** `"1"`, `"0..1"`, `"*"`, `"1..*"`

---

## 4. State Diagram

**Best for:** State machines, lifecycles, process states.

### Example: Document Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Review : Submit
    Review --> Published : Approve
    Review --> Draft : Reject
    Published --> Archived : Archive
    Archived --> [*]

    state Review {
        [*] --> Pending
        Pending --> Approved
        Pending --> Rejected
    }
```

---

## 5. ER Diagram

**Best for:** Database schemas, data modeling.

### Example: Blog Database Schema

```mermaid
erDiagram
    USER {
        int id PK
        string email UK
        string name
        datetime created_at
    }

    POST {
        int id PK
        int user_id FK
        string title
        text content
        string status
    }

    COMMENT {
        int id PK
        int post_id FK
        int user_id FK
        text body
    }

    USER ||--o{ POST : writes
    POST ||--o{ COMMENT : has
    USER ||--o{ COMMENT : writes
```

### Syntax Guide

**Relationships:**

- `||--||` - One to one
- `||--o{` - One to zero or more
- `||--|{` - One to one or more
- `}o--o{` - Zero or more to zero or more

**Keys:** `PK` (primary), `FK` (foreign), `UK` (unique)

---

## 6. Gantt Chart

**Best for:** Project planning, timelines, sprint schedules.

### Example: Project Timeline

```mermaid
gantt
    title Website Development
    dateFormat YYYY-MM-DD
    excludes weekends

    section Planning
        Requirements :done, p1, 2024-01-01, 5d
        Design :done, p2, after p1, 7d

    section Development
        Backend :active, dev1, after p2, 14d
        Frontend :crit, dev2, after p2, 14d

    section Launch
        Testing :test, after dev1, 7d
        Deploy :milestone, deploy, after test, 1d
```

### Syntax Guide

**Status:** `done`, `active`, `crit` (critical), `milestone`

**Duration:** `5d` (days), `2w` (weeks), `after task_id`

---

## 7. User Journey

**Best for:** UX design, customer experience mapping.

### Example: E-commerce Checkout

```mermaid
journey
    title Shopping Experience
    section Discovery
        Search products: 5: Customer
        View product details: 4: Customer
    section Purchase
        Add to cart: 5: Customer
        Checkout process: 3: Customer
        Payment: 4: Customer
    section Post-purchase
        Order confirmation: 5: Customer
        Delivery tracking: 4: Customer
```

### Syntax Guide

**Score:** 1 (very bad) to 5 (very good)

**Format:** `Step name: score: Actor`

---

## 8. Git Graph

**Best for:** Visualizing Git workflows, branching strategies.

### Example: Feature Branch Workflow

```mermaid
gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "feat-a"
    commit id: "feat-b"
    branch feature/auth
    checkout feature/auth
    commit id: "login"
    commit id: "register"
    checkout develop
    merge feature/auth
    checkout main
    merge develop tag: "v1.0"
    commit id: "hotfix"
```

### Syntax Guide

**Commands:** `commit`, `branch`, `checkout`, `merge`, `cherry-pick`

**Tags:** `commit tag: "v1.0"`

---

## 9. Mindmap

**Best for:** Brainstorming, knowledge organization, hierarchical ideas.

### Example: Web Development Stack

```mermaid
mindmap
  root((Web Dev))
    Frontend
      React
      Vue
      Angular
      Styling
        CSS
        Tailwind
    Backend
      Node.js
      Python
      Go
      APIs
        REST
        GraphQL
    DevOps
      Docker
      CI/CD
      Cloud
        AWS
        GCP
```

---

## 10. Pie Chart

**Best for:** Showing percentages, data distribution.

### Example: Budget Allocation

```mermaid
pie showData title Budget Distribution
    "Development" : 40
    "Marketing" : 25
    "Operations" : 20
    "Design" : 15
```

### Syntax Guide

`pie showData title "Title"` - Shows values on chart

---

## 11. Timeline

**Best for:** Chronological events, product roadmaps, history.

### Example: Product Roadmap

```mermaid
timeline
    title Product Roadmap 2024
    section Q1
        January : MVP launch
        February : User feedback
        March : v1.1 release
    section Q2
        April : Mobile app
        May : API v2
        June : Enterprise features
    section Q3
        July : Internationalization
        August : Performance optimization
        September : v2.0 launch
```

---

## 12. Kanban Board

**Best for:** Agile task management, sprint boards.

### Example: Sprint Board

```mermaid
kanban
  Backlog
    [Dark mode]@{ assigned: 'Alice', priority: 'High' }
    [API docs]@{ assigned: 'Bob', priority: 'Medium' }
  In Progress
    [User auth]@{ assigned: 'Carol', priority: 'High' }
    [Dashboard]@{ assigned: 'Dave', priority: 'High' }
  Review
    [Settings page]@{ assigned: 'Eve', priority: 'Medium' }
  Done
    [Landing page]@{ assigned: 'Frank', priority: 'High' }
```

### Syntax Guide

**Metadata:** `@{ assigned: 'name', priority: 'High' }`

---

## 13. Quadrant Chart

**Best for:** Feature prioritization, strategic analysis, 2x2 matrices.

### Example: Feature Priority Matrix

```mermaid
quadrantChart
    title Feature Priority
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 Quick Wins
    quadrant-2 Major Projects
    quadrant-3 Fill Ins
    quadrant-4 Thankless Tasks
    Dark mode: [0.2, 0.8]
    SSO login: [0.7, 0.9]
    CSV export: [0.3, 0.4]
    Animations: [0.8, 0.2]
```

### Syntax Guide

**Coordinates:** Range from 0.0 to 1.0 for both x and y

---

## 14. Sankey Diagram

**Best for:** Flow quantities, conversion funnels, budget allocation.

### Example: User Conversion Funnel

```mermaid
sankey-beta

Visitors,Sign up,1000
Visitors,Bounce,2000
Sign up,Trial,600
Sign up,Free,400
Trial,Paid,200
Trial,Churn,400
```

---

## 15. XY Chart

**Best for:** Bar charts, line charts with numerical data.

### Example: Monthly Revenue

```mermaid
xychart-beta
    title "Monthly Revenue 2024"
    x-axis ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    y-axis "Revenue ($)" 0 --> 100000
    bar [45000, 52000, 48000, 61000, 55000, 72000]
    line [45000, 52000, 48000, 61000, 55000, 72000]
```

### Syntax Guide

**Types:** `bar` (bar chart), `line` (line chart)

---

## 16. Block Diagram

**Best for:** Custom layouts, grid-style arrangements.

### Example: System Architecture

```mermaid
block-beta
    columns 3
    Frontend["Frontend\nReact"]
    space
    Backend["Backend\nNode.js"]
    space:2
    DB[("Database\nPostgreSQL")]

    Frontend --> Backend
    Backend --> DB
```

### Syntax Guide

**Layout:** `columns N` defines grid width

**Spanning:** `Block:2` spans 2 columns

---

## 17. Architecture Diagram

**Best for:** Cloud architecture, infrastructure topology.

### Example: AWS Infrastructure

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    service lb(server)[Load Balancer] in aws
    service api(server)[API Gateway] in aws
    service app(server)[App Server] in aws
    service db(database)[Database] in aws
    service cache(database)[Redis] in aws

    lb:R --> L:api
    api:R --> L:app
    app:B --> T:db
    app:B --> T:cache
```

### Syntax Guide

**Icons:** `server`, `database`, `disk`, `cloud`

**Directions:** `L` (left), `R` (right), `T` (top), `B` (bottom)

---

## 18. Packet Diagram

**Best for:** Network packet structures, protocol headers.

### Example: IPv4 Header

```mermaid
packet-beta
    0-3: "Version"
    4-7: "IHL"
    8-15: "DSCP/ECN"
    16-31: "Total Length"
    32-47: "Identification"
    48-63: "Flags & Offset"
    64-71: "TTL"
    72-79: "Protocol"
    80-95: "Checksum"
    96-127: "Source IP"
    128-159: "Dest IP"
```

### Syntax Guide

**Format:** `start-end: "Field name"`

---

## 19. Requirement Diagram

**Best for:** Requirements traceability, systems engineering.

### Example: System Requirements

```mermaid
requirementDiagram

requirement uptime_req {
    id: 1
    text: System uptime must be 99.9 percent
    risk: high
    verifymethod: analysis
}

FunctionalRequirement auth_req {
    id: 2
    text: Users must authenticate before accessing data
    risk: high
    verifymethod: test
}

PerformanceRequirement perf_req {
    id: 3
    text: Page load under 200ms
    risk: medium
    verifymethod: test
}

element auth_service {
    type: service
    docref: "auth-spec.pdf"
}

element perf_monitor {
    type: "unit test"
    docref: "LoadTest.cs"
}

auth_service - satisfies -> auth_req
perf_monitor - verifies -> perf_req
auth_req - traces -> uptime_req
```

### Syntax Guide

**Types:** `requirement`, `FunctionalRequirement`, `PerformanceRequirement`

**Risk:** `low`, `medium`, `high`

**Verify method:** `test`, `analysis`, `inspection`, `demonstration`

---

## Quick Reference: Choosing the Right Diagram

| Need                            | Use                  |
| ------------------------------- | -------------------- |
| Process flow, workflow          | `flowchart`          |
| API documentation, message flow | `sequenceDiagram`    |
| Database schema                 | `erDiagram`          |
| Class structure, OOP            | `classDiagram`       |
| State machine, lifecycle        | `stateDiagram-v2`    |
| Project timeline                | `gantt`              |
| Git branching strategy          | `gitGraph`           |
| Cloud infrastructure            | `architecture-beta`  |
| Brainstorming, ideas            | `mindmap`            |
| Task board, agile               | `kanban`             |
| Prioritization matrix           | `quadrantChart`      |
| Conversion funnel               | `sankey-beta`        |
| Bar/line charts                 | `xychart-beta`       |
| Percentages                     | `pie`                |
| Chronological events            | `timeline`           |
| User experience                 | `journey`            |
| Network packets                 | `packet-beta`        |
| Requirements                    | `requirementDiagram` |
| Custom layout                   | `block-beta`         |

---

## Tips for Best Results

1. **Use double quotes for labels with spaces**: `A["Label with spaces"]`
2. **Avoid special characters in node IDs**: Use underscores instead of hyphens
3. **Always declare direction in flowcharts**: `flowchart TD` or `flowchart LR`
4. **Keep labels concise**: Long labels make diagrams hard to read
5. **Use emoji for visual cues**: ✅ Success, ❌ Error, ⚠️ Warning
6. **Test in Mermaid Live Editor**: [mermaid.live](https://mermaid.live) for debugging

---

## Configuration

You can add YAML frontmatter to customize diagram appearance:

```mermaid
---
config:
  theme: dark
  look: handDrawn
---
flowchart LR
    A --> B
```

**Themes:** `default`, `dark`, `forest`, `base`, `neutral`

**Looks:** `default`, `handDrawn`, `classic`
