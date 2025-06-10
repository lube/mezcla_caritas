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

En la página principal puedes crear una nueva partida. Los participantes se unen subiendo su foto. El organizador inicia la ronda y se generarán imágenes combinadas. Después de adivinar se muestran los puntajes.

Este proyecto es solo un MVP y almacena todo en memoria.

## Despliegue

1. Instala las dependencias con `npm install`.
2. Asegúrate de que exista la variable de entorno `PORT` si quieres usar un
   puerto distinto a `3000`.
3. Inicia el servidor con `npm start` y verifica que el proceso esté corriendo.
4. En producción puedes usar un manejador de procesos como
   [PM2](https://pm2.keymetrics.io/) o configurar un servicio de sistema para
   garantizar que la aplicación se reinicie si se detiene.

Las carpetas `uploads/` y `combinations/` se crean automáticamente al iniciar la
aplicación. Es recomendable usar un proxy inverso (por ejemplo Nginx) para
exponer el puerto de la app y servirla con HTTPS.
