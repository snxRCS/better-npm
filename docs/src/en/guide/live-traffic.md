# Live Traffic

The Live Traffic view shows incoming requests to your proxy hosts in real time, directly from nginx access logs.

## How It Works

Better NPM tails all `proxy-host-X_access.log` and `default-host_access.log` files in `/data/logs/` and streams new log entries to the browser via Server-Sent Events.

## What It Shows

Each incoming request appears as a row with:

| Column | Description |
|--------|-------------|
| Time | Timestamp of the request |
| Host | Which proxy host received the request |
| Method | HTTP method (GET, POST, PUT, …) |
| Path | Request path |
| Status | HTTP response status code (200, 301, 404, 502, …) |
| Response Time | Time to first byte in ms |
| Client IP | Originating IP address |

## Where to Find It

Click **Live Traffic** in the sidebar. The stream starts immediately — new requests appear as they arrive.

## Requirements

- nginx must be writing logs to `/data/logs/` (default behaviour, no extra config needed)
- Works with all proxy host types

## Troubleshooting

**No traffic showing?**

1. Make sure at least one proxy host has been accessed since the Live Traffic page was opened
2. Check that log files exist in `/data/logs/`:
   ```bash
   ls /opt/containers/npm/data/logs/
   ```
3. Verify nginx is running and forwarding requests correctly
