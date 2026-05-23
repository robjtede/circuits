## Flow

A small canvas-based Flow game.

### Development

Install dependencies:

```sh
npm install
```

Start the local dev server:

```sh
npm run dev
```

Create a production build:

```sh
npm run build
```

Build the container image:

```sh
docker build -t flow .
```

Run the container locally:

```sh
docker run --rm -p 8080:80 flow
```

### Known Issues

- Mouse/touch events need re-factoring

### To start

- Modularization
- Handle window resize
- Level design/creator tool
- Database system
- Check amount of flows completed
- Assume straight line behavior
