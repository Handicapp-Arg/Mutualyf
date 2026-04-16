# Guia completa del sistema RAG de MutualyF

Este documento explica como funciona el sistema de conocimiento (RAG) que alimenta al asistente de IA, desde la perspectiva de un admin que quiere entender que pasa cuando carga informacion.

---

## 1. Que es RAG y para que sirve

**RAG = Retrieval Augmented Generation** (Generacion Aumentada por Recuperacion).

### Analogia simple

Imagina que la IA es un empleado nuevo muy inteligente pero que **no sabe nada de MutualyF**. Vos le das una carpeta con apuntes (la base de conocimiento). Cuando un afiliado pregunta algo, el empleado:

1. Busca en la carpeta los apuntes mas relevantes a la pregunta
2. Lee esos apuntes
3. Responde usando esa info + su inteligencia general

**La IA NO memoriza tu informacion**. Cada vez que un usuario pregunta, el sistema:

- Encuentra fragmentos relevantes en tu base de conocimiento
- Se los pasa a la IA junto con la pregunta
- La IA responde basandose en lo que le pasaste

Esto significa que **podes actualizar la informacion sin reentrenar la IA**. Si manana cambias un horario, lo cargas en el portal y al instante la IA responde con el dato nuevo.

---

## 2. Las dos caras del portal admin

### `/portal/knowledge` — Conocimiento (QUE sabe la IA)

Aca cargas la informacion que la IA debe conocer:
- Horarios, telefonos, direcciones
- Coberturas medicas, beneficios, tramites
- Descripcion de servicios

Es como llenar la "carpeta de apuntes" del empleado.

### `/portal/ai-config` — Configuracion (COMO se comporta la IA)

Aca defines:
- Personalidad (formal, amigable, directa)
- Tono (calido, profesional)
- Reglas (no dar diagnosticos, derivar a humano si X)
- Modelo de IA a usar

Es como entrenar el "estilo" del empleado.

**Resumen**: Conocimiento = datos. Configuracion = personalidad. Los dos juntos hacen al asistente.

---

## 3. Como cargar conocimiento

Hay 3 formas:

### Opcion A — Texto en la UI (rapido para una cosa puntual)

1. Vas a `/portal/knowledge`
2. Tab "Texto"
3. Escribis:
   - **Titulo**: nombre descriptivo (ej: "Horarios de atencion")
   - **Categoria**: (ver seccion 4)
   - **Contenido**: el texto en si
4. Click "Agregar documento"

### Opcion B — Subir archivo (PDF, MD, TXT)

1. Vas a `/portal/knowledge`
2. Tab "Archivo"
3. Click el area de drag-and-drop o selecciona
4. Pones titulo y categoria
5. Click "Subir archivo"

Sirve para PDFs largos (manual de procedimientos, folleto institucional, etc).

### Opcion C — Carga masiva desde carpeta del servidor (RECOMENDADO para entrenamiento inicial)

1. En el servidor, pones tus archivos en:
   ```
   backend/prisma/data/knowledge/<categoria>/<nombre del doc>.md
   ```
2. En la UI, click **"Cargar carpeta"**
3. Procesa todos los archivos de una vez

Ventaja: podes versionar los .md en git, editarlos en cualquier editor, y recargarlos cuando quieras.

---

## 4. Categorias: cuales hay y como elegir

Las categorias son **etiquetas** que ayudan al sistema a buscar mas precisamente. Cuando el usuario pregunta algo, el sistema detecta la categoria probable y prioriza fragmentos de esa categoria.

### Categorias disponibles

| Categoria | Para que la uses |
|-----------|-----------------|
| `general` | Identidad de la mutual, ambiguedades, comportamiento del asistente, ejemplos de conversaciones |
| `services` | Coberturas medicas, beneficios sociales, prestaciones |
| `payments` | Cuotas, formas de pago, copagos, planes |
| `meds` | Medicamentos, recetas, descuentos en farmacia |
| `procedure` | Tramites: autorizaciones, ordenes medicas, reintegros, credenciales |
| `legal` | Reglamento interno, condiciones, terminos |
| `platform` | App movil, sitio web, canales de atencion |
| `contact` | Direcciones, telefonos, emails, sedes |

### Como elegir bien la categoria

**Pregunta clave**: si un afiliado preguntara sobre este tema, en que categoria buscaria mentalmente?

**Ejemplos**:
- "Como autorizo una resonancia" → `procedure` (es un tramite)
- "Cuanto cuesta el plan basico" → `payments`
- "Que farmacias tienen descuento" → `meds`
- "Donde queda la sede de Rosario" → `contact`
- "Como descargo la app" → `platform`

**Regla de oro**: si el contenido toca varios temas, usa la categoria del tema **principal**. Si no encaja en ninguna, usa `general`.

**Consecuencia practica**: si pones todo en `general`, el sistema funciona pero pierde precision. Categorizar bien mejora la calidad de las respuestas.

---

## 5. Titulo: para que sirve

El titulo cumple **3 funciones**:

### 5.1. Identificacion en el portal

Cuando ves la lista de documentos en `/portal/knowledge`, el titulo es lo que distingue uno del otro. Si tenes 50 docs llamados "Documento 1", "Documento 2"... no vas a saber cual editar.

**Buenos titulos**:
- "Cobertura de oncologia"
- "Telefonos de las 3 sedes"
- "Reintegros: como solicitarlos"

**Malos titulos**:
- "info"
- "doc1"
- "datos importantes"

### 5.2. Ayuda al chunking (segmentacion)

El titulo se considera al separar el contenido. Documentos con titulos claros generan mejores fragmentos.

### 5.3. Trazabilidad

Cuando la IA responde y ves los logs, podes saber **de que documento vino la respuesta**. Si el titulo es claro, el debugging es directo.

---

## 6. Que pasa despues de cargar (paso a paso)

Cuando haces click en "Agregar documento" o "Cargar carpeta", el sistema ejecuta esta cadena:

### Paso 1: Validacion
- Categoria valida (ver lista)
- Contenido entre 40 caracteres y 2 MB
- Hash SHA-256 del contenido (para deduplicacion)

### Paso 2: Deduplicacion
Si ya existe un documento con el **mismo hash de contenido**, no lo duplica. Te devuelve `skipped: true, reason: "hash-exists"`.

Esto evita ingestas duplicadas si re-corres "Cargar carpeta" sin cambios.

### Paso 3: Versionado
Si existe otro doc con el **mismo `source`** (pero contenido diferente), el viejo se archiva (`status=archived`) y el nuevo entra como version 2, 3, etc.

### Paso 4: Chunking (segmentacion)
El contenido se corta en **fragmentos de ~500 tokens** con **80 tokens de overlap** entre cada uno.

**Como corta**:
1. Primero intenta cortar por `\n\n` (parrafos)
2. Despues por `\n` (saltos de linea)
3. Despues por `". "` (oraciones)
4. Como ultimo recurso, por espacios

**Por que el overlap?** Para que un concepto que esta justo en el limite entre dos chunks no se pierda. Asi un fragmento siempre tiene un poquito de contexto del anterior.

**Ejemplo**:
Si tu doc dice:
```
## Horarios

Lunes a viernes: 9 a 17 hs.
Sabados: 9 a 13 hs.

## Telefonos

Casa central: 0342 456 7890
Atencion al afiliado: 0800 555 6838
```

El chunker probablemente genera **2 fragmentos**:
- Chunk 1: "## Horarios\n\nLunes a viernes: 9 a 17 hs.\nSabados: 9 a 13 hs."
- Chunk 2: "## Telefonos\n\nCasa central: 0342 456 7890\nAtencion al afiliado: 0800 555 6838"

(Con un poco de overlap en el medio.)

### Paso 5: Embeddings (vectorizacion)
Cada chunk se convierte en un **vector de 768 numeros** usando el modelo `nomic-embed-text` (Ollama local) o Gemini como fallback.

**Que es un vector?** Es la "huella semantica" del fragmento. Dos chunks con significados similares tienen vectores cercanos en el espacio matematico.

**Ejemplo intuitivo**:
- "horario de atencion" → `[0.12, -0.45, 0.78, ...]`
- "cuando atienden" → `[0.11, -0.43, 0.79, ...]` (vector parecido)
- "como pago la cuota" → `[0.55, 0.21, -0.33, ...]` (vector muy diferente)

### Paso 6: Indexado
Cada chunk se guarda en **3 lugares**:

1. **Tabla `knowledge_chunks` (SQLite/Prisma)**: el contenido textual
2. **Tabla `kb_vec_v3` (sqlite-vec)**: el vector de 768 dimensiones
3. **Tabla `kb_fts_v2` (FTS5)**: el contenido indexado para busqueda por palabras clave

Las tablas vec/FTS viven en un **archivo separado** (`chat-rag.db`) para no interferir con la DB de Prisma.

### Paso 7: Cache invalidation
El cache de busquedas se limpia, asi las proximas consultas usan la info nueva.

---

## 7. Que pasa cuando un usuario pregunta

Cuando un afiliado escribe en el chat:

### Paso 1: Reescritura de la query
Si la pregunta es ambigua o usa pronombres ("y eso?", "cuanto sale?"), el sistema la reescribe usando el contexto del historial.

**Ejemplo**:
- Usuario: "como pido una autorizacion?"
- Bot: [responde]
- Usuario: "y para los estudios?"
- Sistema reescribe: "como pido una autorizacion para estudios?"

### Paso 2: Clasificacion de intencion
El router clasifica la query en:
- `chitchat` (saludos, gracias) → respuesta rapida sin RAG
- `rag` con categoria detectada → busqueda completa
- `offtopic` (tema no relacionado) → respuesta de cortesia

### Paso 3: Doble busqueda

#### a) Busqueda vectorial (semantica)
La query se convierte en vector y busca los **K chunks mas cercanos** en el espacio vectorial.

Ventaja: encuentra fragmentos por **significado**, no por palabras exactas. "horario" matchea con "cuando atienden".

#### b) Busqueda FTS (palabras clave)
Busqueda BM25 clasica con tokenizacion en español.

Ventaja: encuentra coincidencias **exactas** de palabras (utiles para nombres propios, codigos, etc).

### Paso 4: Fusion RRF
Los resultados de ambas busquedas se fusionan con **Reciprocal Rank Fusion**, que combina los rankings dando un score unificado.

### Paso 5: Filtrado por categoria
Si la query tenia una categoria detectada con confianza, los chunks que no son de esa categoria se descartan.

### Paso 6: Hidratacion
Para los top-K chunks, se traen los datos completos desde Prisma (contenido, titulo del doc, etc).

### Paso 7: Construccion del prompt
Se arma el mensaje para la IA:

```
[System prompt + reglas del asistente]

[Contexto recuperado:]
- Fragmento 1: ...
- Fragmento 2: ...
- Fragmento 3: ...

[Historial del chat]

[Pregunta del usuario]
```

### Paso 8: Respuesta de la IA
La IA (Gemini, OpenAI, etc) recibe todo y responde basandose en los fragmentos.

---

## 8. Como mejorar la calidad de las respuestas

### Tip 1: Documentos pequeños y enfocados
**Mejor**: 10 archivos de 1 tema cada uno.
**Peor**: 1 archivo gigante con todos los temas.

Por que? Cuando el sistema busca chunks, si todo el tema X esta en el doc Y, la busqueda recupera chunks de Y enteros y la IA tiene mejor contexto.

### Tip 2: Estructura con titulos markdown

Los `##` y `###` ayudan al chunker a cortar en limites logicos.

**Bueno**:
```markdown
## Cobertura odontologica

Incluye limpieza, extracciones simples y empastes.

## Cobertura oftalmologica

Una consulta anual sin cargo. Anteojos con descuento del 30%.
```

**Malo** (todo en un parrafo):
```
La cobertura odontologica incluye limpieza, extracciones simples y empastes. La cobertura oftalmologica permite una consulta anual sin cargo y descuento del 30% en anteojos.
```

El chunker probablemente meta los dos temas en un solo chunk si esta todo junto.

### Tip 3: Lenguaje natural, no abreviaturas internas

**Bueno**: "El afiliado debe presentar la credencial fisica o digital"
**Malo**: "Aff debe present cred fis/dig"

La IA entiende mejor lenguaje natural.

### Tip 4: Repetir keywords clave

Si un concepto se busca con varias palabras (ej: "horario", "hora", "cuando atienden"), incluir las variantes en el contenido mejora el recall.

### Tip 5: Fragmentos auto-contenidos

Cada chunk debe poder leerse solo. Si pones "Este es el segundo punto del capitulo 3", al recuperarlo aislado no se entiende.

**Bueno**: "Para reintegros de medicamentos, presentar receta y factura."
**Malo**: "Para esto, hace falta lo mismo que el caso anterior."

### Tip 6: Categorizar bien

Una query categorizada como `procedure` solo busca en chunks `procedure`. Si pones tramites en `general`, no los va a encontrar bien.

### Tip 7: Cuando algo no funciona, usa "Re-indexar"

Si cambiaste el modelo de embeddings o sospechas inconsistencia, el boton "Re-indexar" reconstruye los indices vec/FTS desde cero, repoblando con los chunks actuales.

---

## 9. Workflow tipico recomendado

### Inicio del proyecto
1. Crea archivos `.md` en `backend/prisma/data/knowledge/<categoria>/`
2. Editalos en tu editor favorito
3. Click "Cargar carpeta" en el portal
4. Probas el chat con queries reales

### Mantenimiento
1. Cuando una respuesta falla, identificas que falto en la base
2. Editas o agregas el `.md` correspondiente
3. Borras el doc viejo desde la UI (boton rojo)
4. Click "Cargar carpeta" → re-ingesta el archivo modificado
5. Re-pruebas

### Cambios urgentes (sin tocar archivos)
1. Vas a `/portal/knowledge` tab "Texto"
2. Cargas un doc nuevo con el cambio
3. Listo, instantaneo

---

## 10. Cuando usar Quick Replies vs Conocimiento

| Caso | Usar |
|------|------|
| Pregunta MUY frecuente con respuesta fija (ej: "horarios?") | **Quick Reply** |
| Informacion que la IA debe saber para responder con contexto | **Conocimiento (RAG)** |
| Respuesta que cambia segun como pregunta el usuario | **Conocimiento (RAG)** |
| Saludos, despedidas, agradecimientos | **Quick Reply** |
| Politica de precios, coberturas, tramites | **Conocimiento (RAG)** |

**Regla**: si la respuesta es **identica** sin importar como se pregunte, usa Quick Reply (es instantaneo, sin gasto de IA). Si la respuesta debe **adaptarse al contexto**, usa Conocimiento (RAG).

---

## 11. Troubleshooting

### "Cargar carpeta" no entra ningun doc
- Verifica que los archivos esten en `backend/prisma/data/knowledge/<categoria>/`
- La carpeta `<categoria>` debe ser una de las validas (general, services, payments, meds, procedure, legal, platform, contact)
- Los archivos deben ser `.md`, `.txt` o `.pdf`
- Si todos dicen `hash-exists`, ya estan ingresados (es un dedup correcto)

### Errores de "database disk image is malformed"
- Las tablas vec/FTS viven en `chat-rag.db` (separado de Prisma)
- Si se corrompe ese archivo, podes borrarlo y al reiniciar el backend se recrea vacio
- Despues hace falta re-ingestar todo

### La IA no encuentra info que esta cargada
- Verifica que el doc este en estado `Activo` (verde)
- Click "Re-indexar" para reconstruir los indices
- Verifica que la categoria sea correcta
- Revisa si el contenido tiene las palabras clave que el usuario usaria

### Quiero ver que chunks genero un doc
- En `/portal/knowledge`, click sobre cualquier doc
- Se abre un modal con todos los fragmentos, sus tokens, modelo de embedding, etc

---

## 12. Resumen visual del flujo

```
┌─────────────────────────────────────────┐
│ Vos cargas: "Cobertura odontologia.md"  │
│ con titulo, categoria, contenido        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Chunker: corta en ~5 fragmentos de 500  │
│ tokens, con overlap de 80               │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Embedding: cada fragmento → vector 768d │
│ (nomic-embed-text via Ollama)           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Guardado en 3 tablas:                   │
│  - knowledge_chunks (texto)             │
│  - kb_vec_v3 (vector)                   │
│  - kb_fts_v2 (FTS5 keyword index)       │
└─────────────────────────────────────────┘

═══════════════════════════════════════════

┌─────────────────────────────────────────┐
│ Usuario: "que cubre el plan dental?"    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Reescritura + clasificacion             │
│ → categoria: "services"                 │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌──────────────────┬──────────────────────┐
│ Vec search       │ FTS search           │
│ (semantica)      │ (palabras clave)     │
│ top 15 chunks    │ top 15 chunks        │
└────────┬─────────┴────────┬─────────────┘
         │                  │
         └────────┬─────────┘
                  ▼
┌─────────────────────────────────────────┐
│ Fusion RRF + filtro categoria           │
│ → top 5 chunks finales                  │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│ Prompt con contexto + pregunta → IA     │
│ → IA responde con info de los chunks    │
└─────────────────────────────────────────┘
```

---

**Resumen de una linea**: Cargas docs → se cortan en fragmentos → cada fragmento se vectoriza → cuando un usuario pregunta, se buscan los fragmentos mas relevantes y se le pasan a la IA con la pregunta. La IA responde basandose en esos fragmentos.
