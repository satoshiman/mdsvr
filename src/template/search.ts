import type { Settings } from "../settings/index.js";

export function renderSearchModal(settings: Settings): string {
  if (!settings.search.enabled) {
    return "";
  }

  return `
<div id="search-modal" class="search-modal" style="display: none;">
  <div class="search-overlay" onclick="closeSearch()"></div>
  <div class="search-container">
    <div class="search-header">
      <input
        type="text"
        id="search-input"
        class="search-input"
        placeholder="${settings.search.placeholder}"
        autocomplete="off"
      />
      <button class="search-close" onclick="closeSearch()">×</button>
    </div>
    <div id="search-results" class="search-results"></div>
    <div class="search-footer">
      <span>Press <kbd>Esc</kbd> to close</span>
      <span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span>
    </div>
  </div>
</div>
`;
}

export function renderSearchTrigger(settings: Settings): string {
  if (!settings.search.enabled) {
    return "";
  }

  return `
<button class="search-trigger" onclick="openSearch()" title="Search (Cmd+K)">
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M14 14L11.3333 11.3333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <span class="search-shortcut">⌘K</span>
</button>
`;
}

export function getSearchInlineScript(): string {
  return `
<script>
(function() {
  let searchIndex = null;
  let searchModal = null;
  let searchInput = null;
  let searchResults = null;
  let selectedIndex = -1;

  function init() {
    searchModal = document.getElementById('search-modal');
    searchInput = document.getElementById('search-input');
    searchResults = document.getElementById('search-results');

    if (!searchModal) return;

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
      // Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openSearch();
      }
      // Escape
      if (e.key === 'Escape' && searchModal.style.display === 'block') {
        closeSearch();
      }
      // Arrow navigation
      if (searchModal.style.display === 'block') {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          selectResult();
        }
      }
    });

    // Input handler
    if (searchInput) {
      searchInput.addEventListener('input', debounce(performSearch, 150));
    }

    // Load search index
    loadSearchIndex();
  }

  async function loadSearchIndex() {
    try {
      const res = await fetch('/search-index.json');
      if (res.ok) {
        searchIndex = await res.json();
      }
    } catch (e) {
      console.error('Failed to load search index:', e);
    }
  }

  window.openSearch = function() {
    if (!searchModal) return;
    searchModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  };

  window.closeSearch = function() {
    if (!searchModal) return;
    searchModal.style.display = 'none';
    document.body.style.overflow = '';
    selectedIndex = -1;
    if (searchInput) searchInput.value = '';
    if (searchResults) searchResults.innerHTML = '';
  };

  function performSearch() {
    const query = (searchInput?.value || '').toLowerCase().trim();
    if (!query || !searchIndex) {
      if (searchResults) searchResults.innerHTML = '';
      return;
    }

    const results = searchIndex
      .map(item => {
        let score = 0;
        const titleLower = item.title.toLowerCase();
        const contentLower = item.content.toLowerCase();

        // Title match is weighted higher
        if (titleLower === query) score += 100;
        else if (titleLower.startsWith(query)) score += 50;
        else if (titleLower.includes(query)) score += 25;

        // Content match
        if (contentLower.includes(query)) score += 10;

        // Heading match
        if (item.headings.some(h => h.toLowerCase().includes(query))) score += 15;

        return { item, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => r.item);

    renderResults(results, query);
  }

  function renderResults(results, query) {
    if (!searchResults) return;

    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-no-results">No results found</div>';
      return;
    }

    const html = results.map((result, index) => {
      const highlighted = highlightText(result.excerpt || result.content.slice(0, 200), query);
      const selectedClass = index === 0 ? 'selected' : '';
      return '<a href="' + result.href + '" class="search-result ' + selectedClass + '" data-index="' + index + '">' +
          '<div class="search-result-title">' + escapeHtml(result.title) + '</div>' +
          '<div class="search-result-excerpt">' + highlighted + '</div>' +
        '</a>';
    }).join('');

    searchResults.innerHTML = html;
    selectedIndex = results.length > 0 ? 0 : -1;

    // Add click handlers
    searchResults.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', function(e) {
        if (e.target.tagName !== 'A') {
          const href = this.getAttribute('href');
          if (href) window.location.href = href;
        }
      });
    });
  }

  function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const regex = new RegExp('(' + escapeRegex(query) + ')', 'gi');
    return escapeHtml(text).replace(regex, '<mark>$1</mark>');
  }

  function escapeRegex(string) {
    var special = /[\\^$.*+?()[\]{}|]/g;
    return string.replace(special, '\\$&');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function moveSelection(delta) {
    const items = searchResults?.querySelectorAll('.search-result');
    if (!items || items.length === 0) return;

    items[selectedIndex]?.classList.remove('selected');
    selectedIndex = (selectedIndex + delta + items.length) % items.length;
    items[selectedIndex]?.classList.add('selected');
    items[selectedIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function selectResult() {
    const items = searchResults?.querySelectorAll('.search-result');
    if (items && items[selectedIndex]) {
      const href = items[selectedIndex].getAttribute('href');
      if (href) window.location.href = href;
    }
  }

  function debounce(fn, wait) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), wait);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
</script>
`;
}
