# Welcome to mdsvr /Markdown Server/!

You haven't specified a documentation directory.

## How to use

To serve your documentation, run:

```bash
mdsvr <docs-directory>
```

**Examples:**

```bash
mdsvr ./docs
mdsvr ./notes
mdsvr ./documentation
```

## Options

```bash
mdsvr <dir> [options]

Options:
  -p, --port N       Port number (default: 1800)
  --host H           Bind address (default: localhost)
  -o, --open         Auto-open browser
  -s, --silent       Suppress console output
  --init             Create a starter settings.json in [dir]
  --validate         Validate settings.json and exit
  --no-watch         Disable settings.json hot-reload
  -v, --version      Print version
  -h, --help         Print this help
```

## Documentation

Visit [mdsvr GitHub](https://github.com/satoshiman/mdsvr) for more information.
