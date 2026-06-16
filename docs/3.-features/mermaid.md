# Mermaid Test

Learn more about Mermaid at [mermaid.js.org](https://mermaid.js.org/)

## Flowchart

```mermaid
flowchart LR
  A[Start] --> B{Decision}
  B -->|Yes| C[Do it]
  B -->|No| D[Skip]
  C --> E[End]
  D --> E
```

## Sequence Diagram

```mermaid
sequenceDiagram
  Alice->>Bob: Hello
  Bob-->>Alice: Hi there
```

## Mindmap

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

### Giant E-Commerce Database Schema

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
