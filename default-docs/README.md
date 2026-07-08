# Welcome to mdsvr (Markdown Server)

<span style="color: #16a34a; font-weight: bold;">✅ Your **mdsvr** instance is running successfully.</span>

> <span style="color: #dc2626; font-weight: bold;">⚠️ Configuration required</span>
>
> <span style="color: #dc2626;">If you are seeing this page, your documentation has not been loaded correctly. This usually means one of the following:</span>
>
> <span style="color: #dc2626;">1. No documentation directory was specified when starting <code>mdsvr &lt;directory&gt;</code>.</span>
>
> <span style="color: #dc2626;">2. Your Markdown files were not mounted into the Docker container at <code>/app/docs</code>.</span>

Please verify your configuration and follow the instructions below.

## Getting Started

To serve a directory containing Markdown files, run:

```bash
mdsvr <docs-directory>
```

### Examples

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

## Docker

> **Note:** If you're seeing this page, it means you haven't mounted your own documentation directory yet. See the examples below to serve your own docs.

### Serve your own documentation

```bash
docker run -d -p 1800:1800 -v /path/to/your/docs:/app/docs ghcr.io/satoshiman/mdsvr:latest
```

### Custom port

```bash
docker run -d -p 8080:1800 -v /path/to/your/docs:/app/docs ghcr.io/satoshiman/mdsvr:latest
```

### Build from source

```bash
docker build -t mdsvr .
docker run -d -p 1800:1800 -v /path/to/your/docs:/app/docs mdsvr
```

## Documentation

Visit [mdsvr GitHub](https://github.com/satoshiman/mdsvr) for more information.
