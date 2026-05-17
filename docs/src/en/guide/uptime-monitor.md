# Uptime Monitor

Better NPM continuously checks the availability of all your proxy hosts and shows their status directly in the dashboard.

## How It Works

- A background service pings every proxy host every **60 seconds**
- Results are stored in the database (24-hour history, last 100 checks per host)
- Each proxy host in the list shows a live **status badge** (green = up, red = down)
- The dedicated **Uptime** page shows detailed stats for all hosts

## What It Shows

### Status Badges in Proxy Host List

Every proxy host row has a small colored dot:
- 🟢 **Green** — host responded within the last check cycle
- 🔴 **Red** — host is unreachable or returned an error
- ⚪ **Grey** — not yet checked (first check pending)

### Uptime Page

Navigate to **Uptime** in the sidebar. For each proxy host you see:

| Column | Description |
|--------|-------------|
| Host | Domain name and forward target |
| Status | Current up/down status |
| Response Time | Latest response time in ms |
| Uptime % | Percentage of successful checks (last 100) |
| Last Checked | Timestamp of the most recent check |

## Configuration

No configuration needed. The uptime monitor starts automatically with the container.

The check interval is fixed at **60 seconds**. History is kept for **24 hours**.

## Requirements

- No extra setup required
- Works with all proxy host types (HTTP, HTTPS)
- Does not require the Docker socket proxy
