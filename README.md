# Mezcla Caritas

Sitio web de prueba para jugar con fotos mezcladas entre amigos. Cualquier persona puede crear una partida, subir su foto y comenzar a jugar sin autenticación.

## Requisitos
- Node.js 20

## Instalación

```bash
npm install
```

## Uso

```bash
npm start
```

Luego abre `http://localhost:3000` en tu navegador.

Antes de iniciar asegúrate de definir la variable `OPENAI_API_KEY`. Puedes crear un
archivo `.env` con el siguiente contenido:

```
OPENAI_API_KEY=tu_clave_aqui
```

En la página principal puedes crear una nueva partida. Los participantes se unen subiendo su foto. El organizador inicia la ronda y se generarán imágenes combinadas. Después de adivinar se muestran los puntajes.

Este proyecto es solo un MVP y almacena todo en memoria.

## Estilos
La interfaz usa [Tailwind CSS](https://tailwindcss.com/) a través de su CDN, por lo que no se necesita configuración adicional.
