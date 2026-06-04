# Testing

Content

## h2 - 1

Content

### h3 - 1.1.1

Content

## h2 - 1.2

## h2 - 1.1

Content

## h2 - 1.2

Content

### h3 - 1.1.1

Content

#### h4 - 1.1.1.1

Content

##### h5 - 1.1.1.1.1

Content

###### h6 - 1.1.1.1.1.1

Content

###### h6 - 1.1.1.1.1.2

```javascript
console.log("hello");
// This is a longer JavaScript code block with various functions and examples
function greetUser(name) {
  return `Hello, ${name}! Welcome to mdsvr documentation.`;
}

// Async function example
async function fetchUserData(userId) {
  try {
    const response = await fetch(`/api/users/${userId}`);
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error("Failed to fetch user data:", error);
    return null;
  }
}

// Class example
class DocumentationHelper {
  constructor() {
    this.sections = [];
    this.currentSection = null;
  }

  addSection(title, content) {
    this.sections.push({
      title,
      content,
      timestamp: new Date(),
    });
  }

  getSectionByTitle(title) {
    return this.sections.find((section) => section.title === title);
  }

  getAllSections() {
    return this.sections;
  }
}

// Event listener example
document.addEventListener("DOMContentLoaded", () => {
  console.log("Documentation loaded successfully");

  const searchInput = document.querySelector("#search-input");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      const query = e.target.value;
      console.log(`Searching for: ${query}`);
    });
  }
});

// Utility functions
const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

// Example usage
const helper = new DocumentationHelper();
helper.addSection("Getting Started", "This is the getting started section");
helper.addSection("Configuration", "Learn how to configure mdsvr");

console.log(greetUser("Developer"));
console.log("Current sections:", helper.getAllSections());
```
