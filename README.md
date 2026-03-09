# Body Balance Web

Este repositorio queda como el proyecto web que despliega en Vercel.

## Estructura

- `/Users/jreynoso/I Got You`: web
- `/Users/jreynoso/I Got You Android`: app Android
- `/Users/jreynoso/I Got You iOS`: app iOS

## Desarrollo web

```bash
npm install
npm run web
```

## Build para Vercel

```bash
npm run build:web
```

## API interna

La web ahora consulta datos autenticados de la app mediante endpoints en `api/`, en lugar de depender del código compartido con los proyectos móviles.
