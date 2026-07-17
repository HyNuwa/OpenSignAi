# OpenSign ML Pipeline — Arquitectura de Entrenamiento

> **Estado**: esqueleto creado en `../opensign-ml-pipeline/` (hermana de este monorepo). Datasets pendientes de descarga manual.
> **Alcance**: entrenamiento completo (no MVP). 4 datasets + Llama 3 8B como motor semántico.

---

## 1. Decisión arquitectónica central

El reconocimiento de señas se hace **sobre landmarks (esqueleto), no sobre video crudo**:

- El kiosco (`kiosk-web`) ya extrae 21 puntos por mano con MediaPipe Hands en el navegador (Edge, privado).
- Entrenar el modelo con **el mismo formato** que llega por WebSocket (`PoseFrameDto`) elimina el domain gap entre producción y entrenamiento.
- Los LLMs (Llama 3 8B) **no reconocen señas**: su rol es gramática, post-procesamiento semántico y RAG bancario.

## 2. Inventario de datasets

| Dataset | Tipo | Tamaño | Formato | Rol | Fase |
|---------|------|--------|---------|-----|------|
| **LSA64** | Señas aisladas | 3200 videos, 64 clases, 10 sujetos × 5 reps, ~1.5 GB (cut) | `SIGN_SUBJECT_REP.mp4` | Motor temporal base | 1-2 |
| **LSA16** | Handshapes estáticas | 800 imágenes, 16 formas | `CLASS_SUBJECT_REP.png` | Dactilología | 3 |
| **handshape_datasets** | Librería unificada (pip) | Multi-dataset | API Python | Loader de handshapes | 3 |
| **LSA-T** | Señas continuas | ~22 h, 8459 clips, 103 firmantes, labels español | `meta.csv` + clips + `joints.h5` | Gramática + SLT | 4-5 |

### Notas críticas

- **Licencias**: LSA64 y LSA16 son **CC BY-NC-SA 4.0** — uso comercial NO permitido sin autorización del autor (Facundo Quiroga, UNLP). Para producción bancaria: licencia o datos propios (TV pública).
- **Guantes fluorescentes** en LSA64/LSA16: riesgo de domain gap. MediaPipe Holistic mitiga parcialmente; validar transfer en kiosco y fine-tunear con video propio.
- **LSA-T `joints.h5`** usa YOLOv8-pose, no MediaPipe Hands. Se re-extrae con MediaPipe para alinear con Edge.
- **LSA-T labels son español natural** (no glosas): perfecto para SLT y SFT de Llama 3.

## 3. Estructura de directorios

```
opensign-ml-pipeline/
├── .gitignore                 # ignora data/{raw,interim,processed} y models/
├── README.md
├── pyproject.toml             # torch, mediapipe, onnx, extras [dev, llm, gcp]
├── configs/
│   ├── data/                  # lsa64.yaml, lsa16.yaml, lsat.yaml, handshapes.yaml
│   ├── model/                 # bilstm_isolated.yaml, stgcn_isolated.yaml, handshape_cnn.yaml
│   └── train/                 # default.yaml, gpu_friend.yaml
├── data/
│   ├── raw/                   # INTANGIBLE (no git): videos/imagenes originales
│   ├── interim/               # extracciones parciales reanudables (no git)
│   ├── processed/             # parquet unificado, listo para train (no git)
│   └── splits/                # train/val/test POR SUJETO (JSON, versionado)
├── src/opensign_ml/
│   ├── schemas.py             # dataclasses alineados con PoseFrameDto
│   ├── ingest/                # loaders por dataset
│   ├── extract/               # mediapipe_holistic.py, normalize.py
│   ├── datasets/              # PyTorch Datasets (isolated, continuous, handshape)
│   ├── models/                # bilstm.py, stgcn.py, handshape_cnn.py
│   ├── train/                 # trainer.py, metrics.py
│   ├── export/                # to_onnx.py
│   └── llm/                   # gloss_rewriter.py, sft_config.yaml (fase 5)
├── scripts/                   # 00..09 pipeline numerado
├── models/                    # checkpoints + onnx (no git)
├── notebooks/
└── tests/
```

## 4. Flujo de ingesta unificado

```
raw videos (LSA64 cut / LSA-T clips / LSA16 png)
  -> MediaPipe Holistic (misma config que el kiosco)
  -> normalize (wrist-center, escala por hombro, mask de mano ausente)
  -> parquet procesado (schema único)
  -> splits por sujeto
  -> entrenamiento (BiLSTM -> ST-GCN)
  -> export ONNX
  -> serving en apps/ai-core via gRPC Interpret()
```

### Contrato de features (`configs/data/*.yaml` + `schemas.py`)

```json
{
  "fps_target": 30,
  "seq_len": 64,
  "hands": {"left": 21, "right": 21},
  "coords": ["x", "y", "z"],
  "normalize": "wrist_center_scale_shoulder",
  "missing_hand": "zeros_plus_mask"
}
```

## 5. Fases de entrenamiento

| Fase | Objetivo | Dataset | Modelo | GPU | Entregable |
|------|----------|---------|--------|-----|------------|
| 0 | Esqueleto + checklist | — | — | — | repo + este plan |
| 1 | Extracción landmarks | LSA64 cut | MediaPipe Holistic | CPU | `processed/isolated/` |
| 2 | Clasificador de señas aisladas | LSA64 | BiLSTM → ST-GCN | 3080 Ti | ONNX + métricas subject-independent |
| 3 | Handshape/dactilología | LSA16 + handshape_datasets | CNN ligera | 3080 Ti | ONNX handshape |
| 4 | Señas continuas | LSA-T | Encoder-decoder/CTC sobre landmarks | GPU amigo | SLT baseline |
| 5 | Llama 3 8B | LSA-T labels + glosario bancario | SFT/LoRA | GPU amigo (VRAM) | Grammar-to-Sign + post-SLT |
| 6 | Integración producción | — | ONNX en ai-core | — | Reemplaza stub gRPC |

## 6. Rol de Llama 3 8B

1. **Grammar-to-Sign**: texto bancario → glosas LSA (ya en el plan SaaS).
2. **Post-procesamiento SLT**: glosas ruidosas del modelo de visión → español natural.
3. **RAG bancario**: glosarios financieros orquestados con LangGraph (fase SaaS).

## 7. Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Guantes en LSA64 ≠ manos reales | Validar transfer + fine-tune con video propio/TV |
| Licencia NC de LSA64/LSA16 | Solo R&D; producción = datos propios o licencia |
| LSA-T joints ≠ MediaPipe | Re-extracción con MediaPipe Holistic |
| Vocabulario bancario ausente en datasets | Corpus propio + fallback humano <85% confianza |
| Overfitting (3200 muestras) | Splits por sujeto, augmentación temporal, early stopping |

## 8. Checklist de descarga manual

Ver `opensign-ml-pipeline/scripts/00_download_checklist.md`.

- [ ] LSA64 **cut** (1.5 GB) → `data/raw/lsa64/cut/`
- [ ] LSA-T meta.csv + clips (+ joints.h5 opcional) → `data/raw/lsat/`
- [ ] LSA16 raw o segmented → `data/raw/lsa16/`
- [ ] handshape_datasets vía `pip install handshape_datasets` (cache automático)
