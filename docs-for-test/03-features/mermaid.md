# Mermaid Chart fortesting

Learn more about Mermaid at [mermaid.js.org](https://mermaid.js.org/)

## 1. Flowchart

```mermaid
flowchart TD
    A["Start"] --> B["Process"]
    B --> C{"Decision"}
    C -->|"Yes"| D["Success ✅"]
    C -->|"No"| E["Retry ⚠️"]
    E --> B
```

## 2. Sequence Diagram

```mermaid
sequenceDiagram
    participant User
    participant API
    participant DB

    User ->> API: Request
    API ->> DB: Query
    DB -->> API: Result
    API -->> User: Response
```

## 3. State Diagram

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Running : start
    Running --> Done : complete
    Running --> Error : fail
    Error --> Idle : reset
    Done --> [*]
```

## 4. ER Diagram

```mermaid
erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ ITEM : contains
```

## 5. Pie Chart

```mermaid
pie
    title Tech Stack
    "Node.js" : 40
    "React" : 30
    "Python" : 20
    "Other" : 10
```

## 7. Sequence Diagram

```mermaid
sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi there
```

## 8. Mindmap

```mermaid
mindmap
  root((mindmap))
    Origins
      Long history
      ::icon(fa fa-book)
      Popularisation
        British popular psychology author Tony Buzan
    Research
      On effectiveness<br/>and features
      On Automatic creation
        Uses
            Creative techniques
            Strategic planning
            Argument mapping
    Tools
      Pen and paper
      Mermaid
```

### 9. Giant E-Commerce Database Schema

```mermaid
erDiagram
    USER {
        int id PK
        string email UK
        string password_hash
        string first_name
        string last_name
        string phone
        datetime created_at
        datetime updated_at
        boolean is_active
    }
    USER_PROFILE {
        int user_id PK,FK
        text bio
        date date_of_birth
        string avatar_url
        string timezone
        string language
    }
    USER_ADDRESS {
        int id PK
        int user_id FK
        string street
        string city
        string state
        string zip_code
        string country
        boolean is_default
    }
    PRODUCT_CATEGORY {
        int id PK
        string name UK
        string slug UK
        int parent_id FK
        text description
        int sort_order
    }
    PRODUCT {
        int id PK
        string sku UK
        string name
        text description
        decimal price
        decimal sale_price
        int stock_quantity
        int category_id FK
        int brand_id FK
        boolean is_active
        datetime created_at
    }
    PRODUCT_IMAGE {
        int id PK
        int product_id FK
        string url
        string alt_text
        int sort_order
    }
    PRODUCT_REVIEW {
        int id PK
        int product_id FK
        int user_id FK
        int rating
        text comment
        datetime created_at
    }
    BRAND {
        int id PK
        string name UK
        string slug UK
        string logo_url
        text description
    }
    ORDER {
        int id PK
        string order_number UK
        int user_id FK
        int shipping_address_id FK
        int billing_address_id FK
        decimal subtotal
        decimal shipping_cost
        decimal discount_amount
        decimal total_amount
        string status
        datetime ordered_at
        datetime shipped_at
        datetime delivered_at
    }
    ORDER_ITEM {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
        decimal unit_price
        decimal total_price
    }
    PAYMENT {
        int id PK
        int order_id FK
        string payment_method
        string transaction_id UK
        decimal amount
        string status
        datetime paid_at
    }
    SHOPPING_CART {
        int id PK
        int user_id FK
        datetime created_at
        datetime updated_at
    }
    CART_ITEM {
        int id PK
        int cart_id FK
        int product_id FK
        int quantity
        datetime added_at
    }
    WISHLIST {
        int id PK
        int user_id FK
        int product_id FK
        datetime added_at
    }
    COUPON {
        string code PK
        string type
        decimal value
        decimal minimum_order
        datetime valid_from
        datetime valid_until
        int usage_limit
        int usage_count
        boolean is_active
    }
    ORDER_COUPON {
        int order_id FK
        string coupon_code FK
        decimal discount_amount
    }
    SHIPPING_METHOD {
        int id PK
        string name
        string carrier
        decimal base_cost
        int estimated_days
    }
    INVENTORY_LOG {
        int id PK
        int product_id FK
        int quantity_change
        string reason
        int reference_order_id FK
        datetime created_at
    }

    USER ||--|| USER_PROFILE : has
    USER ||--o{ USER_ADDRESS : owns
    USER ||--o{ ORDER : places
    USER ||--|| SHOPPING_CART : has
    USER ||--o{ WISHLIST : saves
    USER ||--o{ PRODUCT_REVIEW : writes

    PRODUCT_CATEGORY ||--o{ PRODUCT_CATEGORY : "parent of"
    PRODUCT_CATEGORY ||--o{ PRODUCT : contains
    BRAND ||--o{ PRODUCT : manufactures
    PRODUCT ||--o{ PRODUCT_IMAGE : has
    PRODUCT ||--o{ PRODUCT_REVIEW : receives
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    PRODUCT ||--o{ CART_ITEM : "in cart"
    PRODUCT ||--o{ WISHLIST : "in wishlist"
    PRODUCT ||--o{ INVENTORY_LOG : "logged in"

    SHOPPING_CART ||--o{ CART_ITEM : contains
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER ||--|| PAYMENT : has
    ORDER ||--o{ ORDER_COUPON : uses
    ORDER ||--o{ INVENTORY_LOG : "referenced by"
    USER_ADDRESS ||--o{ ORDER : "shipped to"
    USER_ADDRESS ||--o{ ORDER : "billed to"
    SHIPPING_METHOD ||--o{ ORDER : used
    COUPON ||--o{ ORDER_COUPON : applied
```

See more examples at [mermaid.js.org](https://mermaid.js.org/examples/index.html)

## Mermaid best practices prompts

Add this prompt to your system prompt for generating mermaid diagrams best practices:

````
## Mermaid Generation Requirements (IF you use Mermaid to generate chart)

When generating Mermaid diagrams, always follow these rules.

### 1. First choose the most appropriate diagram type

Select the best Mermaid diagram based on the content instead of always using `flowchart`.

Available Mermaid diagram types (latest common syntax):

- flowchart
- graph
- sequenceDiagram
- classDiagram
- stateDiagram-v2
- erDiagram
- journey
- gantt
- pie
- gitGraph
- mindmap
- timeline
- quadrantChart
- requirementDiagram
- sankey-beta
- xychart-beta
- block-beta
- packet-beta
- architecture-beta
- kanban

If multiple formats are suitable, briefly explain why you chose one over the others.

### 2. Generate Mermaid code with maximum compatibility

Always produce Mermaid code that can render successfully on GitHub, Mermaid Live Editor, Obsidian, VSCode plugins, and common Markdown renderers.

### 3. Mermaid syntax precautions

Always follow these rules:

#### Node IDs

- Use only letters, numbers, and underscores.

Example:

```mermaid
A
user_service
db_01
```

Avoid:

```text
user-service
user.api
node(id)
```

#### Node labels

Prefer:

```mermaid
A["User Service"]
```

instead of:

```mermaid
A(User Service)
```

because brackets are generally safer.

#### Escape special characters

Avoid unescaped:

- (
- )
- [
- ]
- {
- }
- <
- >
- |
- "
- '

inside labels whenever possible.

Prefer simple text.

#### Avoid Markdown formatting

Do NOT use inside labels:

- `**`
- `__`
- `` ` ``
- `#`
- HTML tags
- Markdown links

Bad:

```mermaid
A["**API**"]
```

Good:

```mermaid
A["API"]
```

#### Keep labels concise

Prefer:

```mermaid
A["API"]
```

instead of:

```mermaid
A["This API service receives requests from authenticated users"]
```

#### Quote labels containing spaces

Good:

```mermaid
A["Order Service"]
```

instead of:

```mermaid
A[Order Service]
```

#### Avoid reserved keywords as IDs

Do not use IDs like:

- end
- class
- click
- style
- graph
- subgraph

Rename them if needed.

#### For flowcharts

Always specify direction explicitly:

```mermaid
flowchart TD
```

or

```mermaid
flowchart LR
```

Never omit the direction.

#### For subgraphs

Always provide an explicit ID.

Good:

```mermaid
subgraph backend["Backend"]
```

instead of:

```mermaid
subgraph Backend
```

#### For sequence diagrams

Always declare participants first.

Example:

```mermaid
participant User
participant API
participant DB
```

before any messages.

#### For ER diagrams

Always define relationships using valid Mermaid syntax.

Example:

```mermaid
USER ||--o{ ORDER : places
```

Avoid inventing custom operators.

#### For class diagrams

Use proper visibility and typing.

Example:

```text
+createUser()
-password
+id: string
```

#### For state diagrams

Prefer:

```mermaid
stateDiagram-v2
```

instead of the legacy version.

#### Use latest Mermaid syntax Always use the latest stable Mermaid syntax. Avoid deprecated or legacy patterns such as: - `graph` (use `flowchart` instead) - Old `sequenceDiagram` arrow styles like `->` (use `->>` or `-->>`) - Any syntax not supported in Mermaid v10+

#### Line breaks in labels

When a line break is needed inside a node label, always use `<br />` instead of `\n`.

Good:

A["Line one<br />Line two"]

Bad:

A["Line one\n Line two"]

#### For architecture-beta and block-beta

Use only officially supported syntax and avoid mixing flowchart syntax into beta diagrams.

### 4. Styling guidelines

Because the rendered environment may support both light mode and dark mode:

- Do **NOT** use `style`, `classDef`, `class`, `linkStyle`, `themeVariables`, or hardcoded colors unless the user explicitly requests custom styling.
- Do **NOT** rely on background color, border color, or text color to convey meaning.
- Keep diagrams theme agnostic so they remain readable in any renderer.

If visual emphasis is needed, prefer semantic text or emoji instead of colors.

Examples:

- ✅ Success
- ❌ Failure
- ⚠️ Warning
- 🔒 Authentication
- 🔑 Authorization
- 🚀 Deployment
- 📦 Package
- 🗄️ Database
- 🌐 External Service
- 👤 User
- 🤖 Worker
- 💾 Storage

Using emoji to communicate meaning is preferred over fixed styling because it works consistently across light and dark themes.

### 5. Output format

When generating Mermaid:

1. Output only one complete Mermaid code block unless multiple diagrams are explicitly requested.
2. Ensure the code is syntactically valid.
3. Double check for parser-breaking characters before returning.
4. Prefer readability over visual complexity.
5. Do not add custom styling unless explicitly requested.
6. If a diagram would become too crowded, split it into multiple diagrams only when explicitly requested by the user.

````
