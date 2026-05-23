## Circuits

A small canvas-based Circuits game.

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
docker build -t circuits .
```

Run the container locally:

```sh
docker run --rm -p 8080:80 circuits
```

### Known Issues

- Mouse/touch events need re-factoring

### To start

- Modularization
- Handle window resize
- Level design/creator tool
- Database system
- Check amount of circuits completed
- Assume straight line behavior
