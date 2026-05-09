# Calisthenics Mastery

Una Progressive Web App (PWA) para entrenar calistenia de forma estructurada, con seguimiento de progreso y sistema de habilidades gamificado.

## 🚀 Características Principales

- **Programas de Entrenamiento**: 3 rutinas predefinidas (Push, Pull, Core) con warm-up y cooldown
- **Builder de Rutinas Personalizadas**: Crea tus propios programas de entrenamiento
- **Seguimiento de Progreso**: Registro de repeticiones, historial de entrenamientos y estadísticas
- **Skill Tree**: Sistema gamificado de 8 módulos de habilidad con árbol visual de progresión
- **Logros (Achievements)**: 10 logros desbloqueables para mantener la motivación
- **Feedback de Dificultad**: Califica tus entrenamientos y recibe sugerencias adaptativas
- **Compartir Entrenamientos**: Genera URLs únicas para compartir rutinas con amigos
- **PWA Completa**: Instálable como app nativa en móviles y escritorio

## 🛠️ Tecnologías

- **Frontend**: Vanilla JavaScript ES6+, HTML5, CSS3
- **Backend**: Node.js + Express 5.1.0 (servidor estático HTTPS)
- **Base de Datos**: LocalStorage del navegador
- **PWA**: Service Worker, Web App Manifest

## 📦 Instalación

### Requisitos previos
- Node.js versión 16 o superior si se ejecuta el servidor en forma local

### Pasos

1. **Clona el repositorio**
   ```bash
   cd /media/projects/Calis4
   ```

2. **Instala las dependencias**
   ```bash
   npm install
   ```

3. **Inicia el servidor**
   ```bash
   node server.js
   ```

4. **Accede a la aplicación**
   Abre tu navegador y ve a: `https://localhost:3000`

> **Nota**: El servidor usa certificados SSL auto-firmados. Tu navegador mostrará una advertencia de seguridad; debes aceptar el riesgo para continuar.

## 🎮 Uso Básico

### Primera Vez
1. La app te guiará mediante un onboarding interactivo
2. Navega a **Programs** para ver los programas predefinidos
3. Selecciona un programa y haz clic en "Start Program"
4. Completa los ejercicios siguiendo el timer integrado

### Seguimiento de Progreso
- Cada serie que completes se guarda automáticamente
- Al finalizar todos los ejercicios, verás un resumen con:
  - Estadísticas del entrenamiento
  - Opción para calificar dificultad (Too Easy / Just Right / Too Hard)
  - Botón para compartir tu entrenamiento

### Skill Tree
1. Ve a la sección **Skills** en el menú superior
2. Cambia entre **List View** y **Skill Tree** usando los botones superiores
3. Los nodos verdes están completados, naranjas desbloqueados, grises bloqueados
4. Completa ejercicios para avanzar en el árbol y desbloquear habilidades nuevas

## 📁 Estructura del Proyecto

```
/media/projects/Calis4/
├── css/                    # Estilos CSS y fuentes personalizadas
├── js/
│   ├── components/         # Componentes UI reutilizables (header, timer, spinner)
│   ├── services/           # Lógica de negocio (state, API, workout-engine, achievements)
│   ├── utils/              # Utilidades (helpers para gráficos)
│   ├── views/              # 16 vistas SPA (home, programs, exercises, workouts, skills, etc.)
│   └── main.js             # Entry point y enrutado basado en hash (#programs, #exercises, etc.)
├── data/                   # Archivos JSON con datos estáticos:
├── assets/
│   ├── icons/              # Favicons para PWA
│   └── images/muscles/     # Diagramas anatómicos SVG (frontal, posterior + 40 ejercicios)
└── server.js               # Servidor Express con HTTPS
```

## 🔧 Edición de Datos

Los datos se almacenan en archivos JSON. 
```

> **Nota**: Después de modificar los JSON, reinicia el servidor para ver los cambios.

## 📊 Datos Principales

- **Ejercicios**: ~100 ejercicios clasificados por dificultad (beginner/intermediate/advanced)
- **Músculos**: 15 grupos musculares principales
- **Categorías**: 13 categorías de ejercicios
- **Equipamiento**: 5 tipos de equipamiento
- **Programas**: 3 programas predefinidos + rutinas personalizadas ilimitadas
- **Skill Modules**: 8 módulos (Push-Up, Pull-Up, Dip, Handstand, Front Lever, Planche, Muscle-Up, Core Power)

## 🚨 Consideraciones

### Limitaciones Actuales
1. **Datos locales solo**: Todo se guarda en localStorage del navegador (no sincronización cloud)
2. **Sin autenticación**: No hay sistema de usuarios o login
3. **Backend mínimo**: El servidor solo sirve archivos estáticos, no hay API REST real
4. **Certificados SSL auto-firmados**: Advertencias de seguridad en desarrollo

### Mejoras Futuras Sugeridas
- Migrar a un backend real (Firebase, Supabase, o Node.js con base de datos)
- Implementar sistema de autenticación de usuarios
- Agregar sincronización entre dispositivos
- Incluir imágenes/videos reales para los ejercicios (placeholders vacíos actualmente)
- Crear un panel de administración web para editar datos sin modificar JSON manualmente
- Añadir métricas avanzadas (gráficos de progreso, estadísticas detalladas)

## 📝 Licencia

Este proyecto es de uso personal y educativo. Los datos de ejercicios están basados en información pública de calistenia.

## 👨‍💻 Autor

Proyecto desarrollado como aplicación de entrenamiento de calistenia personalizada.

---

## 🙏 Agradecimientos

- wger project (proyectos de fitness open source)
- Calistenia community por el conocimiento compartido
- Node.js y Express teams por el stack utilizado
