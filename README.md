# Articulario

*La lengua por dentro.* Prototipo de modelo 3D esquemático del tracto vocal para ver cómo se articulan [s] y [l] en español. Es una página web: HTML + JavaScript con [three.js](https://threejs.org) (licencia MIT, copia incluida en `vendor/`). Python solo se usa para construir y servir la página.

## Cómo abrirla

**Con internet:** abre `articulario-online.html` con doble clic. Carga three.js desde la CDN jsDelivr.

**Sin internet:** desde esta carpeta, ejecuta

```
python3 -m http.server 8000
```

y abre <http://localhost:8000> en el navegador. Hace falta el servidor porque los navegadores no cargan módulos JavaScript desde `file://`.

## Archivos

| Archivo | Contenido |
|---|---|
| `src/1_util_anatomy.js` | Utilidades (splines), paladar, arcadas, dientes, constructores de geometría, material con relleno de corte |
| `src/2_model.js` | **Posturas** (`POSTURES`), modelo paramétrico de la lengua, colisión con paladar y dientes, mapa de contactos, velo, faringe, laringe, labios |
| `src/3_scene.js` | Escena, colores, relleno de los cortes, flujo de aire, etiquetas |
| `src/4_ui.js` | Estado, palatograma EPG, glotis, descripciones de cada sonido (`DESC`), audio sintético, vistas y cámara |
| `plantilla.html` | Maquetación y CSS; `/*__APP__*/` marca dónde se inserta el JavaScript |
| `build.py` | Une `plantilla.html` y `src/*.js` y genera los dos HTML |

Después de editar algo en `src/` o en `plantilla.html`, ejecuta `python3 build.py`.

## Coordenadas

En centímetros: **x** hacia atrás, **y** hacia arriba y **z** lateral. El plano medio es z = 0 y el origen queda aproximadamente en el borde de los incisivos superiores. Los alvéolos están en x ≈ 0,8–1,3, la bóveda en x ≈ 3,5 (y ≈ 2,4) y el final del paladar duro en x = 5,3.

## Editar una postura (`POSTURES` en `src/2_model.js`)

Las posturas en uso son `rest` (reposo), `s` y `l`. También está guardada `s_ap`, una [s] apicoalveolar que la interfaz no usa por ahora.

| Parámetro | Qué controla |
|---|---|
| `mid` | Contorno mediosagital del dorso, 13 puntos [x, y] de la punta a la raíz |
| `r` | Altura de los bordes laterales respecto a la línea media en 10 nudos (`U_KN`): positivo = surco, negativo = bordes bajados |
| `w` | Semianchura de la lengua en los mismos nudos |
| `g0`, `g1` | Anchura del surco: dónde empiezan y acaban de subir los bordes (0 = centro, 1 = borde) |
| `bk0`, `bk1` | Longitud de la parte libre de la punta (valores bajos: punta apoyada abajo; altos: punta levantada) |
| `jaw` | Apertura mandibular en grados |
| `velum` | 0 = velo bajado, 1 = elevado |
| `abd`, `voice` | Separación de las cuerdas vocales y vibración (0–1) |
| `yU`, `yL`, `spread` | Borde del labio superior, borde del labio inferior y estiramiento lateral |

La lengua puede pasarse de largo hacia arriba: el código la recorta contra el paladar y los dientes, y esas zonas de recorte son los contactos del palatograma.

## Añadir un sonido

1. Copia una postura en `POSTURES` con una clave nueva (por ejemplo `t`) y ajusta sus parámetros.
2. Añade un botón en `plantilla.html` y, en `src/4_ui.js`, su entrada en `DESC`, su caso en `targetKey()` y el evento del botón.
3. Si tiene flujo de aire, añade su trayectoria en `computeFlow` (`src/3_scene.js`).
4. Ejecuta `python3 build.py`.

Las posturas están definidas a mano a partir de descripciones articulatorias habituales, no a partir de datos de un hablante.
