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

Este proyecto ahora usa el modelo `gpt-image-1` para generar las mezclas de
fotos. El código envía las peticiones a la API de OpenAI con la opción
`moderation` en nivel bajo. Este modelo siempre devuelve la imagen generada en
base64, por lo que no es necesario especificar `response_format`.

En la página principal puedes crear una nueva partida. Los participantes se unen subiendo su foto. El organizador inicia la ronda y se generarán imágenes combinadas. Después de adivinar se muestran los puntajes.


Cada dispositivo usa una sesión y puede registrar varios jugadores. Los puntajes se agrupan por sesión en la tabla final.

Este proyecto es solo un MVP y almacena todo en memoria.

## Estilos
La interfaz usa [Tailwind CSS](https://tailwindcss.com/) a través de su CDN, por lo que no se necesita configuración adicional.
