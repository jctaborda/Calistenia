// i18n translation module — English (en) and Spanish (es)
// Usage: import { t } from './i18n.js'; ${t('key', { param: 'value' })

const translations = {
  en: {
    // Header & Navigation
    'app.title': 'Calisthenics Mastery',
    'nav.home': 'Home',
    'nav.routines': 'Routines',
    'nav.exercises': 'Exercises',
    'nav.skills': 'Skills',
    'nav.profile': 'Profile',
    'nav.back': 'Back',
    'nav.create': 'Create',

    // Theme
    'theme.light': '☀️ Light',
    'theme.dark': '🌙 Dark',

    // Home View
    'home.welcome': 'Welcome back, {{name}}! 👋',
    'home.subtitle': 'Ready to challenge yourself today?',
    'home.stats.total_workouts': 'Total Workouts',
    'home.stats.streak': 'Day Streak',
    'home.stats.pushups': 'Total Push-Ups',
    'home.stats.achievements': 'Achievements Unlocked',
    'home.quick_actions.title': 'Quick Actions',
    'home.quick_actions.start_routine.title': 'Start Routine',
    'home.quick_actions.start_routine.desc': 'Choose from pre-made routines',
    'home.quick_actions.create_routine.title': 'Create Routine',
    'home.quick_actions.create_routine.desc': 'Build your custom workout',
    'home.quick_actions.skill_tree.title': 'Skill Tree',
    'home.quick_actions.skill_tree.desc': 'Track your skill progression',
    'home.quick_actions.browse_exercises.title': 'Browse Exercises',
    'home.quick_actions.browse_exercises.desc': 'Discover new movements',
    'home.featured.title': 'Featured Routines',
    'home.featured.start': 'Start Now',
    'home.featured.desc': 'A comprehensive workout routine designed for all fitness levels.',
    'home.recent.title': 'Recent Activity',
    'home.no_workouts': 'No workouts completed yet. Start your first workout to see activity here!',
    'home.no_workouts.cta': 'Start Workout',
    'home.quote': '"The only bad workout is the one that didn\'t happen."',
    'home.quote_author': '- Unknown',

    // Onboarding
    'onboarding.title': 'Welcome to Calisthenics Mastery',
    'onboarding.subtitle': "Let's personalize your experience",
    'onboarding.name_label': 'Your Name',
    'onboarding.name_placeholder': 'Enter your name',
    'onboarding.skip': 'Skip',
    'onboarding.get_started': 'Get Started',

    // Exercises View
    'exercises.title': 'Exercise Library',
    'exercises.search_placeholder': 'Search exercises...',
    'exercises.filter_category': 'Category',
    'exercises.filter_difficulty': 'Difficulty',
    'exercises.filter_equipment': 'Equipment',
    'exercises.all': 'All',
    'exercises.beginner': 'Beginner',
    'exercises.intermediate': 'Intermediate',
    'exercises.advanced': 'Advanced',
    'exercises.no_results': 'No exercises found.',
    'exercises.add': 'Add Exercise',
    'exercises.search': 'Search exercises...',
    'exercises.favorites_only': 'Favorites Only',
    'exercises.filter': 'Filters',
    'exercises.no_found': 'No Exercises Found',
    'exercises.try_adjusting': 'Try adjusting your filters or clearing them to see all exercises.',
    'exercises.no_match': 'No exercises match your current criteria.',
    'exercises.clear_filters': 'Clear Filters',
    'exercises.delete': 'Delete',
    'exercises.filter_title': 'Filter Exercises',
    'exercises.filter_categories': 'Categories',
    'exercises.filter_muscles': 'Muscle Groups',
    'exercises.apply_filters': 'Apply Filters',

    // Exercise Details
    'exercise.details.title': 'Exercise Details',
    'exercise.details.description': 'Description',
    'exercise.details.muscles': 'Muscles',
    'exercise.details.secondary_muscles': 'Secondary Muscles',
    'exercise.details.difficulty': 'Difficulty',
    'exercise.details.equipment': 'Equipment',
    'exercise.details.category': 'Category',
    'exercise.details.form_cues': 'Form Cues',
    'exercise.details.common_mistakes': 'Common Mistakes',
    'exercise.details.prerequisites': 'Prerequisites',
    'exercise.details.progressions': 'Progressions',
    'exercise.details.back': 'Back to Exercises',
    'exercise.details.favorite': 'Favorite',
    'exercise.details.favorited': 'Favorited',
    'exercise.details.add_to_routine': 'Add to Routine',

    // Routines View
    'routines.title': 'Workout Routines',
    'routines.not_found': 'Routine not found. Please refresh the page.',
    'routines.delete_error': 'Failed to delete routine. Please try again.',
    'routines.my_routines': 'My Routines',
    'routines.custom': 'Custom Routines',
    'routines.no_routines': 'No routines yet. Create your first one!',
    'routines.create': 'Create New Routine',
    'routines.start': 'Start Now',

    // Routine Details
    'routine_details.title': 'Routine Details',
    'routine_details.warmup': 'Warm Up',
    'routine_details.main': 'Main Exercises',
    'routine_details.cooldown': 'Cool Down',
    'routine_details.duration': 'Duration',
    'routine_details.exercises': 'Exercises',
    'routine_details.sets': 'Sets',
    'routine_details.reps': 'Reps',
    'routine_details.rest': 'Rest',
    'routine_details.start': 'Start Workout',
    'routine_details.back': 'Back to Routines',
    'routine_details.sections': 'Sections',
    'routine_details.no_sections': 'No sections defined for this routine.',

    // Active Workout
    'active_workout.title': 'Active Workout',
    'active_workout.warmup': 'Warm Up',
    'active_workout.main': 'Main',
    'active_workout.cooldown': 'Cool Down',
    'active_workout.set': 'Set',
    'active_workout.of': 'of',
    'active_workout.complete_set': 'Complete Set',
    'active_workout.skip_exercise': 'Skip Exercise',
    'active_workout.finish': 'Finish Workout',
    'active_workout.timer': 'Timer',
    'active_workout.rest': 'Rest',
    'active_workout.hiit': 'HIIT',
    'active_workout.exercise': 'Exercise',
    'active_workout.progress': 'Progress',
    'active_workout.next_set': 'Next Set',
    'active_workout.adjust': 'Adjust',
    'active_workout.swap_exercise': 'Swap Exercise',
    'toast.work_time': 'Work time!',
    'toast.rest_time': 'Rest time!',

    // Workout Completion
    'completion.title': 'Workout Complete! 🎉',
    'completion.congrats': 'Great job, {{name}}!',
    'completion.duration': 'Duration',
    'completion.exercises': 'Exercises Completed',
    'completion.total_reps': 'Total Reps',
    'completion.rate': 'Rate this workout',
    'completion.rate_beginner': 'Too Easy',
    'completion.rate_just_right': 'Just Right',
    'completion.rate_advanced': 'Too Hard',
    'completion.save': 'Save Workout',
    'completion.home': 'Back to Home',

    // Workout Summary
    'summary.title': 'Workout Summary',
    'summary.back': 'Back to Home',
    'summary.date': 'Date',
    'summary.duration': 'Duration',
    'summary.exercises': 'Exercises',
    'summary.rating': 'Rating',
    'summary.no_data': 'No workout data available.',

    // Skill Modules
    'skills.title': 'Skill Modules',
    'skills.browse': 'Browse all skill modules',
    'skills.exercises': 'exercises',
    'skills.prerequisites': 'Prerequisites',
    'skills.complete': 'Complete',
    'skills.in_progress': 'In Progress',
    'skills.locked': 'Locked',
    'skills.back': 'Back to Skills',

    // Skills Tree
    'skills_tree.title': 'Skills Tree',
    'skills_tree.undefined': 'Undefined',
    'skills_tree.load_error': 'Unable to load exercises. Please try again later.',
    'skills_tree.exercise_progression': 'Exercise Progression Tree',
    'skills_tree.back': 'Back to Skills',
    'skills_tree.module': 'Module',
    'skills_tree.exercise': 'Exercise',
    'skills_tree.all_categories': 'All Categories',
    'skills_tree.all_difficulties': 'All Difficulties',

    // Profile
    'profile.title': 'Profile',
    'profile.data_management': 'Data Management',
    'profile.data_management_desc': 'Backup & Restore: Export your workout history and routines, or restore from a backup file.',
    'profile.export_import': '📤 Export / Import Data',
    'profile.name': 'Name',
    'profile.level': 'Level',
    'profile.body_metrics': 'Body Metrics',
    'profile.weight': 'Weight (kg/lbs):',
    'profile.weight_placeholder': 'e.g., 70',
    'profile.body_fat': 'Body Fat (%)',
    'profile.body_fat_placeholder': 'e.g., 15',
    'profile.add_metric': 'Add Metric',
    'profile.metrics_date': 'Date',
    'profile.metrics_weight': 'Weight',
    'profile.metrics_body_fat': 'Body Fat',
    'profile.metrics_action': 'Action',
    'profile.metrics_delete': 'Delete',
    'profile.no_metrics': 'No metrics logged yet.',
    'profile.achievements': 'Achievements',
    'profile.potential_achievements': 'Potential Achievements',
    'profile.no_achievements': 'No achievements unlocked yet. Complete workouts to earn them!',
    'profile.no_potential': 'No achievements unlocked yet.',
    'profile.workout_history': 'Workout History',
    'profile.no_workouts': 'No workouts completed yet.',
    'profile.back_to_home': 'Back to Home',
    'profile.weight_validation': 'Please enter a valid weight.',
    'profile.body_fat_validation': 'Please enter a valid body fat percentage.',
    'profile.body_fat_range': 'Body fat percentage must be between 0 and 100',

    // Builder
    'builder.title': 'Create Routine',
    'builder.name': 'Routine Name',
    'builder.name_placeholder': 'My Workout',
    'builder.description': 'Description',
    'builder.description_placeholder': 'What does this routine target?',
    'builder.difficulty': 'Difficulty',
    'builder.duration': 'Duration',
    'builder.duration_placeholder': 'e.g., 30 min',
    'builder.category': 'Category',
    'builder.add_exercise': 'Add Exercise',
    'builder.remove': 'Remove',
    'builder.save': 'Save Routine',
    'builder.back': 'Back to Routines',
    'builder.sets': 'Sets',
    'builder.reps': 'Reps',
    'builder.rest': 'Rest (sec)',
    'builder.no_exercises': 'No exercises added yet.',
    'builder.search_placeholder': 'Search exercises...',
    'builder.section_name': 'Section Name',
    'builder.section_placeholder': 'e.g., Warm Up',
    'builder.add_section': 'Add Section',
    'builder.delete_section': 'Delete Section',

    // Export/Import
    'export_import.title': 'Export / Import Data',
    'export_import.export_desc': 'Download all your workout data as a JSON backup file.',
    'export_import.export_btn': '📤 Export Data',
    'export_import.import_desc': 'Upload a backup file to restore or merge your data.',
    'export_import.import_btn': '📥 Import Data',
    'export_import.clear_desc': 'Permanently delete all stored data including workout history, routines, and settings.',
    'export_import.clear_btn': '🗑️ Clear All Data',
    'export_import.clear_confirm': 'Are you sure? This cannot be undone.',
    'export_import.back': 'Back to Profile',
    'export_import.export_success': 'Data exported successfully!',
    'export_import.import_success': 'Data imported successfully!',
    'export_import.clear_success': 'All data cleared.',
    'export_import.validation_error': 'Invalid backup file format.',
    'export_import.merge': 'Merge with existing data',

    // Error View
    'error.title': 'Something went wrong',
    'error.message': 'An error occurred while loading this page.',
    'error.back': 'Back to Home',
    'error.go_home': 'Go Home',

    // Toast messages
    'toast.exercise_added': 'Exercise added to routine',
    'toast.exercise_removed': 'Exercise removed from routine',
    'toast.routine_saved': 'Routine saved!',
    'toast.routine_deleted': 'Routine deleted.',
    'toast.undo': 'Undo',
    'toast.set_completed': 'Set completed!',
    'toast.workout_saved': 'Workout saved!',
    'toast.module_saved': 'Module saved!',
    'toast.module_deleted': 'Module deleted.',
    'toast.exercise_favorite': 'Exercise toggled favorite',

    // Common / shared
    'common.loading': 'Loading...',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.create': 'Create',
    'common.confirm': 'Confirm',
    'common.search': 'Search',
    'common.none': 'None',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Info',
    'common.clear': 'Clear',
    'common.view': 'View',
    'common.start': 'Start',
    'common.add': 'Add',
    'common.remove': 'Remove',

    // Workout workflow
    'workflow.confirm_finish': 'Are you sure you want to finish this workout?',
    'workflow.confirm_skip': 'Skip this exercise?',

    // Module Admin
    'module_admin.title_create': 'Create Module',
    'module_admin.title_edit': 'Edit Module',
    'module_admin.name': 'Module Name',
    'module_admin.name_placeholder': 'e.g., Push-Up Progression',
    'module_admin.description': 'Description',
    'module_admin.description_placeholder': 'Describe this module...',
    'module_admin.exercises': 'Exercises',
    'module_admin.add_exercise': 'Add Exercise',
    'module_admin.remove': 'Remove',
    'module_admin.save': 'Save Module',
    'module_admin.back': 'Back',
    'module_admin.no_exercises': 'No exercises added.',
    'module_admin.not_found': 'Module not found. Redirecting to module list.',
    'module_admin.load_error': 'Error loading module: ',
    'module_admin.no_exercises_desc': 'No exercises selected. Use the filter below to find and select exercises.',
    'module_admin.enter_name': 'Please enter a module name.',
    'module_admin.select_exercise': 'Please select at least one exercise for this module.',
    'module_admin.updated': 'Module updated successfully!',
    'module_admin.update_error': 'Error updating module: ',
    'module_admin.created': 'Module created successfully!',
    'module_admin.create_error': 'Error creating module: ',
    'module_admin.unknown_difficulty': 'Unknown difficulty',

    // Shared Workout
    'shared_workout.title': 'Shared Workout',
    'shared_workout.not_found': 'Workout Not Found',
    'shared_workout.not_found_desc': "The shared workout you're looking for doesn't exist or has been removed.",
    'shared_workout.back': 'Back to Home',
    'shared_workout.shared_on': 'Shared on',
    'shared_workout.comments': 'Comments',
    'shared_workout.no_comments': 'No comments yet. Be the first to comment!',
    'shared_workout.your_name': 'Your name',
    'shared_workout.write_comment': 'Write a comment...',
    'shared_workout.post_comment': 'Post Comment',
    'shared_workout.not_logged': 'Not logged',
    'shared_workout.enter_name_comment': 'Please enter both a name and comment.',

    // Routine Details
    'routine_details.edit': 'Edit Routine',
    'routine_details.copy': '📋 Copy Routine',
    'routine_details.delete': 'Delete Routine',
    'routine_details.target_muscles': 'Target Muscles',
    'routine_details.exercises_section': 'Exercises',
    'routine_details.unknown_exercise': 'Unknown Exercise (ID: ',
    'routine_details.routine_copy_clipboard': 'Routine copied to clipboard!',
    'routine_details.routine_copy_failed': 'Failed to copy routine to clipboard.',
    'routine_details.delete_confirm': 'Are you sure you want to delete ',
    'routine_details.delete_action': 'This action cannot be undone.',
    'routine_details.delete_success': 'Routine deleted successfully!',
    'routine_details.delete_error': 'Error deleting routine: ',

    // Builder
    'builder.back_routines': 'Back to Routines',
    'builder.back_modules': 'Back to Modules',
    'builder.create_new': 'Create New Routine',
    'builder.edit_routine': 'Edit Routine',
    'builder.edit_module': 'Edit Module',
    'builder.routine_name': 'Routine Name',
    'builder.module_name': 'Module Name',
    'builder.enter_name': 'Enter name...',
    'builder.routine_details': 'Routine Details',
    'builder.module_details': 'Module Details',
    'builder.select_category': 'Select Category...',
    'builder.select_difficulty': 'Select Difficulty...',
    'builder.duration_minutes': 'Duration (minutes)',
    'builder.selected_exercises': 'Selected Exercises (drag to reorder)',
    'builder.no_exercises_selected': 'No Exercises Selected Yet',
    'builder.select_exercises_desc': 'Select exercises from the list below to build your routine or module.',
    'builder.available_exercises': 'Available Exercises',
    'builder.no_exercises_available': 'No exercises available',
    'builder.search_available': 'Search available exercises...',
    'builder.create_routine_btn': 'Create Routine',
    'builder.update_routine_btn': 'Update Routine',
    'builder.save_module_btn': 'Save Module',
    'builder.no_exercises_selected_yet': 'No exercises selected yet.',
    'builder.remove_confirm': 'Are you sure you want to remove ',
    'builder.remove_from_routine': ' from this routine? This will not delete the exercise itself.',
    'builder.enter_name_error': 'Please enter a name.',
    'builder.select_exercise_error': 'Please select at least one exercise.',
    'builder.enter_description_error': 'Please enter a description for the routine.',
    'builder.module_updated': 'Module updated successfully!',
    'builder.module_created': 'New module created successfully!',
    'builder.routine_created': 'New routine created and saved successfully!',
    'builder.routine_error': 'Error creating routine: ',
    'builder.routine_not_found': 'Routine not found!',
    'builder.routine_updated': 'Routine updated and saved successfully!',
    'builder.routine_update_error': 'Error updating routine: ',
    'builder.save_error': 'Error saving module: ',

    // Export/Import
    'export_import.header': 'Export & Import',

    // Exercise Details
    'exercise_details.no_description': 'No description available.',
    'exercise_details.none_specified': 'None specified',
    'exercise_details.image': 'image',
    'exercise_details.not_found': 'Exercise not found.',
    'exercise_details.exercise_information': 'Exercise Information',
    'exercise_details.progression_chain': 'Progression Chain',
    'exercise_details.performance_history': 'Performance History',
    'exercise_details.muscle_engagement': 'Muscle Engagement',
    'exercise_details.front_view': 'Front View',
    'exercise_details.back_view': 'Back View',
    'exercise_details.skill_level': 'Skill Level: ',
    'exercise_details.equipment_label': 'Equipment: ',
    'exercise_details.categories_label': 'Categories: ',
    'exercise_details.muscles_targeted': 'Muscles Targeted: ',
    'exercise_details.form_cues_label': 'Form Cues: ',
    'exercise_details.common_mistakes_label': 'Common Mistakes to Avoid: ',
    'exercise_details.prerequisites_label': 'Prerequisites: ',
    'exercise_details.progressions_label': 'Progressions (Next Steps): ',
    'exercise_details.date_label': 'Date: ',
    'exercise_details.reps_label': 'Total Reps: ',
    'exercise_details.no_form_cues': 'No form cues provided',
    'exercise_details.no_common_mistakes': 'No common mistakes noted',
    'exercise_details.no_data': 'No data',
    'exercise_details.prereq_none': 'None - this is a starting exercise',
    'exercise_details.progression_none': "None - you've mastered this exercise!",
    'exercise_details.favorite': 'Favorite',

    // Workout Completion
    'completion.unknown_exercise': 'Unknown Exercise',
    'completion.unknown': 'Unknown',

    // Workout Summary
    'summary.custom_workout': 'Custom Workout',

    // Skill Module Detail
    'skill_module_detail.no_description': 'No description available.',
    'skill_module_detail.na': 'N/A',
    'skill_module_detail.mixed': 'mixed',

    // Skill Modules
    'skill_modules.uncategorized': 'Uncategorized',

    // Onboarding
    'onboarding.name_validation': 'Please enter your name.',
    'onboarding.welcome': 'Welcome to Calisthenics Mastery',
    'onboarding.subtitle': "Let's personalize your experience",

    // Data labels (dynamic)
    'data.pushup': 'Push-Up',
    'data.dip': 'Dip',
    'data.handstand': 'Handstand',
    'data.pullup': 'Pull-Up',
    'data.core': 'Core',
    'data.planche': 'Planche',
    'data.front_lever': 'Front Lever',

    // Admin
    'admin.title': 'Module Admin',
    'admin.create': 'Create Module',

    // Upgrade prompt (SW update)
    'sw_update.message': 'A new version of the app is available. Would you like to update?',
    'sw_update.yes': 'Update',
    'sw_update.no': 'Not now',

    // Routine builder types
    'routine_type.push': 'Push',
    'routine_type.pull': 'Pull',
    'routine_type.core': 'Core',
    'routine_type.legs': 'Legs',
    'routine_type.cardio': 'Cardio',
    'routine_type.full_body': 'Full Body',
    'routine_type.custom': 'Custom',

    // Difficulty labels
    'difficulty.beginner': 'Beginner',
    'difficulty.intermediate': 'Intermediate',
    'difficulty.advanced': 'Advanced',
  },
  es: {
    // Header & Navigation
    'app.title': 'Dominio de Calistenia',
    'nav.home': 'Inicio',
    'nav.routines': 'Rutinas',
    'nav.exercises': 'Ejercicios',
    'nav.skills': 'Habilidades',
    'nav.profile': 'Perfil',
    'nav.back': 'Atrás',
    'nav.create': 'Crear',

    // Theme
    'theme.light': '☀️ Claro',
    'theme.dark': '🌙 Oscuro',

    // Home View
    'home.welcome': '¡Bienvenido de nuevo, {{name}}! 👋',
    'home.subtitle': '¿Listo para desafiar hoy?',
    'home.stats.total_workouts': 'Entrenamientos',
    'home.stats.streak': 'Racha de Días',
    'home.stats.pushups': 'Flexiones Totales',
    'home.stats.achievements': 'Logros Desbloqueados',
    'home.quick_actions.title': 'Acciones Rápidas',
    'home.quick_actions.start_routine.title': 'Iniciar Rutina',
    'home.quick_actions.start_routine.desc': 'Elige entre rutinas predefinidas',
    'home.quick_actions.create_routine.title': 'Crear Rutina',
    'home.quick_actions.create_routine.desc': 'Construye tu entrenamiento personalizado',
    'home.quick_actions.skill_tree.title': 'Árbol de Habilidades',
    'home.quick_actions.skill_tree.desc': 'Sigue tu progreso de habilidades',
    'home.quick_actions.browse_exercises.title': 'Explorar Ejercicios',
    'home.quick_actions.browse_exercises.desc': 'Descubre nuevos movimientos',
    'home.featured.title': 'Rutinas Destacadas',
    'home.featured.start': 'Iniciar Ahora',
    'home.featured.desc': 'Una rutina de entrenamiento completa diseñada para todos los niveles.',
    'home.recent.title': 'Actividad Reciente',
    'home.no_workouts': 'Aún no has completado entrenamientos. ¡Inicia tu primer entrenamiento para ver la actividad aquí!',
    'home.no_workouts.cta': 'Iniciar Entrenamiento',
    'home.quote': '"El único mal entrenamiento es el que no ocurrió."',
    'home.quote_author': '- Desconocido',

    // Onboarding
    'onboarding.title': 'Bienvenido a Dominio de Calistenia',
    'onboarding.subtitle': 'Personalicemos tu experiencia',
    'onboarding.name_label': 'Tu Nombre',
    'onboarding.name_placeholder': 'Ingresa tu nombre',
    'onboarding.skip': 'Omitir',
    'onboarding.get_started': 'Comenzar',

    // Exercises View
    'exercises.title': 'Biblioteca de Ejercicios',
    'exercises.search_placeholder': 'Buscar ejercicios...',
    'exercises.filter_category': 'Categoría',
    'exercises.filter_difficulty': 'Dificultad',
    'exercises.filter_equipment': 'Equipo',
    'exercises.all': 'Todos',
    'exercises.beginner': 'Principiante',
    'exercises.intermediate': 'Intermedio',
    'exercises.advanced': 'Avanzado',
    'exercises.no_results': 'No se encontraron ejercicios.',
    'exercises.add': 'Añadir Ejercicio',
    'exercises.search': 'Buscar ejercicios...',
    'exercises.favorites_only': 'Solo Favoritos',
    'exercises.filter': 'Filtros',
    'exercises.no_found': 'No se encontraron ejercicios',
    'exercises.try_adjusting': 'Intenta ajustar tus filtros o limpiarlos para ver todos los ejercicios.',
    'exercises.no_match': 'No hay ejercicios que coincidan con tus criterios actuales.',
    'exercises.clear_filters': 'Limpiar Filtros',
    'exercises.delete': 'Eliminar',
    'exercises.filter_title': 'Filtrar Ejercicios',
    'exercises.filter_categories': 'Categorías',
    'exercises.filter_muscles': 'Grupos Musculares',
    'exercises.apply_filters': 'Aplicar Filtros',

    // Exercise Details
    'exercise.details.title': 'Detalles del Ejercicio',
    'exercise.details.description': 'Descripción',
    'exercise.details.muscles': 'Músculos',
    'exercise.details.secondary_muscles': 'Músculos Secundarios',
    'exercise.details.difficulty': 'Dificultad',
    'exercise.details.equipment': 'Equipo',
    'exercise.details.category': 'Categoría',
    'exercise.details.form_cues': 'Indicaciones de Forma',
    'exercise.details.common_mistakes': 'Errores Comunes',
    'exercise.details.prerequisites': 'Prerrequisitos',
    'exercise.details.progressions': 'Progresiones',
    'exercise.details.back': 'Volver a Ejercicios',
    'exercise.details.favorite': 'Favorito',
    'exercise.details.favorited': 'En Favoritos',
    'exercise.details.add_to_routine': 'Agregar a Rutina',

    // Routines View
    'routines.title': 'Rutinas de Entrenamiento',
    'routines.not_found': 'Rutina no encontrada. Por favor actualiza la página.',
    'routines.delete_error': 'Error al eliminar la rutina. Intenta de nuevo.',
    'routines.my_routines': 'Mis Rutinas',
    'routines.custom': 'Rutinas Personalizadas',
    'routines.no_routines': 'Aún no hay rutinas. ¡Crea tu primera!',
    'routines.create': 'Crear Nueva Rutina',
    'routines.start': 'Iniciar Ahora',

    // Routine Details
    'routine_details.title': 'Detalles de la Rutina',
    'routine_details.warmup': 'Calentamiento',
    'routine_details.main': 'Ejercicios Principales',
    'routine_details.cooldown': 'Vuelta a la Calma',
    'routine_details.duration': 'Duración',
    'routine_details.exercises': 'Ejercicios',
    'routine_details.sets': 'Series',
    'routine_details.reps': 'Reps',
    'routine_details.rest': 'Descanso',
    'routine_details.start': 'Iniciar Entrenamiento',
    'routine_details.back': 'Volver a Rutinas',
    'routine_details.sections': 'Secciones',
    'routine_details.no_sections': 'No hay secciones definidas para esta rutina.',

    // Active Workout
    'active_workout.title': 'Entrenamiento Activo',
    'active_workout.warmup': 'Calentamiento',
    'active_workout.main': 'Principal',
    'active_workout.cooldown': 'Vuelta a la Calma',
    'active_workout.set': 'Serie',
    'active_workout.of': 'de',
    'active_workout.complete_set': 'Completar Serie',
    'active_workout.skip_exercise': 'Saltar Ejercicio',
    'active_workout.finish': 'Terminar Entrenamiento',
    'active_workout.timer': 'Temporizador',
    'active_workout.rest': 'Descanso',
    'active_workout.hiit': 'HIIT',
    'active_workout.exercise': 'Ejercicio',
    'active_workout.progress': 'Progreso',
    'active_workout.next_set': 'Siguiente Serie',
    'active_workout.adjust': 'Ajustar',
    'active_workout.swap_exercise': 'Cambiar Ejercicio',
    'toast.work_time': '¡Tiempo de trabajo!',
    'toast.rest_time': '¡Descanso!',

    // Workout Completion
    'completion.title': '¡Entrenamiento Completado! 🎉',
    'completion.congrats': '¡Excelente trabajo, {{name}}!',
    'completion.duration': 'Duración',
    'completion.exercises': 'Ejercicios Completados',
    'completion.total_reps': 'Reps Totales',
    'completion.rate': 'Califica este entrenamiento',
    'completion.rate_beginner': 'Muy Fácil',
    'completion.rate_just_right': 'Justo',
    'completion.rate_advanced': 'Muy Difícil',
    'completion.save': 'Guardar Entrenamiento',
    'completion.home': 'Volver al Inicio',

    // Workout Summary
    'summary.title': 'Resumen del Entrenamiento',
    'summary.back': 'Volver al Inicio',
    'summary.date': 'Fecha',
    'summary.duration': 'Duración',
    'summary.exercises': 'Ejercicios',
    'summary.rating': 'Calificación',
    'summary.no_data': 'No hay datos de entrenamiento disponibles.',

    // Skill Modules
    'skills.title': 'Módulos de Habilidades',
    'skills.browse': 'Explorar todos los módulos de habilidades',
    'skills.exercises': 'ejercicios',
    'skills.prerequisites': 'Prerrequisitos',
    'skills.complete': 'Completado',
    'skills.in_progress': 'En Progreso',
    'skills.locked': 'Bloqueado',
    'skills.back': 'Volver a Habilidades',

    // Skills Tree
    'skills_tree.title': 'Árbol de Habilidades',
    'skills_tree.undefined': 'Indefinido',
    'skills_tree.load_error': 'No se pudieron cargar los ejercicios. Intenta de nuevo más tarde.',
    'skills_tree.exercise_progression': 'Árbol de Progresión de Ejercicios',
    'skills_tree.back': 'Volver a Habilidades',
    'skills_tree.module': 'Módulo',
    'skills_tree.exercise': 'Ejercicio',
    'skills_tree.all_categories': 'Todas las Categorías',
    'skills_tree.all_difficulties': 'Todas las Dificultades',

    // Profile
    'profile.title': 'Perfil',
    'profile.data_management': 'Gestión de Datos',
    'profile.data_management_desc': 'Copia de Seguridad y Restauración: Exporta tu historial de entrenamientos y rutinas, o restaura desde un archivo de respaldo.',
    'profile.export_import': '📤 Exportar / Importar Datos',
    'profile.name': 'Nombre',
    'profile.level': 'Nivel',
    'profile.body_metrics': 'Métricas Corporales',
    'profile.weight': 'Peso (kg/lbs):',
    'profile.weight_placeholder': 'ej., 70',
    'profile.body_fat': 'Grasa Corporal (%)',
    'profile.body_fat_placeholder': 'ej., 15',
    'profile.add_metric': 'Agregar Métrica',
    'profile.metrics_date': 'Fecha',
    'profile.metrics_weight': 'Peso',
    'profile.metrics_body_fat': 'Grasa Corporal',
    'profile.metrics_action': 'Acción',
    'profile.metrics_delete': 'Eliminar',
    'profile.no_metrics': 'Aún no hay métricas registradas.',
    'profile.achievements': 'Logros',
    'profile.potential_achievements': 'Logros Potenciales',
    'profile.no_achievements': 'Aún no has desbloqueado logros. ¡Completa entrenamientos para ganarlos!',
    'profile.no_potential': 'Aún no hay logros desbloqueados.',
    'profile.workout_history': 'Historial de Entrenamientos',
    'profile.no_workouts': 'Aún no has completado entrenamientos.',
    'profile.back_to_home': 'Volver al Inicio',
    'profile.weight_validation': 'Por favor ingresa un peso válido.',
    'profile.body_fat_validation': 'Por favor ingresa un porcentaje válido de grasa corporal.',
    'profile.body_fat_range': 'El porcentaje de grasa corporal debe estar entre 0 y 100',

    // Builder
    'builder.title': 'Crear Rutina',
    'builder.name': 'Nombre de la Rutina',
    'builder.name_placeholder': 'Mi Entrenamiento',
    'builder.description': 'Descripción',
    'builder.description_placeholder': '¿Qué apunta esta rutina?',
    'builder.difficulty': 'Dificultad',
    'builder.duration': 'Duración',
    'builder.duration_placeholder': 'ej., 30 min',
    'builder.category': 'Categoría',
    'builder.add_exercise': 'Agregar Ejercicio',
    'builder.remove': 'Eliminar',
    'builder.save': 'Guardar Rutina',
    'builder.back': 'Volver a Rutinas',
    'builder.sets': 'Series',
    'builder.reps': 'Reps',
    'builder.rest': 'Descanso (seg)',
    'builder.no_exercises': 'No se agregaron ejercicios aún.',
    'builder.search_placeholder': 'Buscar ejercicios...',
    'builder.section_name': 'Nombre de Sección',
    'builder.section_placeholder': 'ej., Calentamiento',
    'builder.add_section': 'Agregar Sección',
    'builder.delete_section': 'Eliminar Sección',

    // Export/Import
    'export_import.title': 'Exportar / Importar Datos',
    'export_import.export_desc': 'Descarga todos tus datos de entrenamiento como un archivo de respaldo JSON.',
    'export_import.export_btn': '📤 Exportar Datos',
    'export_import.import_desc': 'Sube un archivo de respaldo para restaurar o fusionar tus datos.',
    'export_import.import_btn': '📥 Importar Datos',
    'export_import.clear_desc': 'Elimina permanentemente todos los datos almacenados incluyendo historial de entrenamientos, rutinas y configuraciones.',
    'export_import.clear_btn': '🗑️ Borrar Todos los Datos',
    'export_import.clear_confirm': '¿Estás seguro? Esto no se puede deshacer.',
    'export_import.back': 'Volver al Perfil',
    'export_import.export_success': '¡Datos exportados exitosamente!',
    'export_import.import_success': '¡Datos importados exitosamente!',
    'export_import.clear_success': 'Todos los datos borrados.',
    'export_import.validation_error': 'Formato de archivo de respaldo no válido.',
    'export_import.merge': 'Fusionar con datos existentes',

    // Error View
    'error.title': 'Algo salió mal',
    'error.message': 'Ocurrió un error al cargar esta página.',
    'error.back': 'Volver al Inicio',
    'error.go_home': 'Ir al Inicio',

    // Toast messages
    'toast.exercise_added': 'Ejercicio agregado a la rutina',
    'toast.exercise_removed': 'Ejercicio eliminado de la rutina',
    'toast.routine_saved': '¡Rutina guardada!',
    'toast.routine_deleted': 'Rutina eliminada.',
    'toast.undo': 'Deshacer',
    'toast.set_completed': '¡Serie completada!',
    'toast.workout_saved': '¡Entrenamiento guardado!',
    'toast.module_saved': '¡Módulo guardado!',
    'toast.module_deleted': 'Módulo eliminado.',
    'toast.exercise_favorite': 'Favorito alternado',

    // Common / shared
    'common.loading': 'Cargando...',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.edit': 'Editar',
    'common.create': 'Crear',
    'common.confirm': 'Confirmar',
    'common.search': 'Buscar',
    'common.none': 'Ninguno',
    'common.error': 'Error',
    'common.success': 'Éxito',
    'common.warning': 'Advertencia',
    'common.info': 'Información',
    'common.clear': 'Limpiar',
    'common.view': 'Ver',
    'common.start': 'Iniciar',
    'common.add': 'Agregar',
    'common.remove': 'Quitar',

    // Workout workflow
    'workflow.confirm_finish': '¿Estás seguro de que quieres terminar este entrenamiento?',
    'workflow.confirm_skip': '¿Saltar este ejercicio?',

    // Module Admin
    'module_admin.title_create': 'Crear Módulo',
    'module_admin.title_edit': 'Editar Módulo',
    'module_admin.name': 'Nombre del Módulo',
    'module_admin.name_placeholder': 'ej., Progresión de Flexiones',
    'module_admin.description': 'Descripción',
    'module_admin.description_placeholder': 'Describe este módulo...',
    'module_admin.exercises': 'Ejercicios',
    'module_admin.add_exercise': 'Agregar Ejercicio',
    'module_admin.remove': 'Eliminar',
    'module_admin.save': 'Guardar Módulo',
    'module_admin.back': 'Atrás',
    'module_admin.no_exercises': 'No se agregaron ejercicios.',
    'module_admin.not_found': 'Módulo no encontrado. Redirigiendo a la lista.',
    'module_admin.load_error': 'Error al cargar el módulo: ',
    'module_admin.no_exercises_desc': 'No se seleccionaron ejercicios. Usa el filtro para encontrar y seleccionar ejercicios.',
    'module_admin.enter_name': 'Por favor ingresa un nombre para el módulo.',
    'module_admin.select_exercise': 'Por favor selecciona al menos un ejercicio para este módulo.',
    'module_admin.updated': '¡Módulo actualizado exitosamente!',
    'module_admin.update_error': 'Error al actualizar el módulo: ',
    'module_admin.created': '¡Módulo creado exitosamente!',
    'module_admin.create_error': 'Error al crear el módulo: ',
    'module_admin.unknown_difficulty': 'Dificultad desconocida',
    'module_admin.basic_info': 'Información Básica',
    'module_admin.difficulty': 'Dificultad',
    'module_admin.category': 'Categoría',
    'module_admin.select_category': 'Seleccionar categoría...',
    'module_admin.delete_confirm': '¿Estás seguro de que quieres eliminar ',
    'module_admin.delete_action': '? Esta acción no se puede deshacer.',
    'module_admin.delete_error': 'Error al eliminar el módulo: ',

    // Shared Workout
    'shared_workout.title': 'Entrenamiento Compartido',
    'shared_workout.not_found': 'Entrenamiento No Encontrado',
    'shared_workout.not_found_desc': 'El entrenamiento compartido que buscas no existe o ha sido eliminado.',
    'shared_workout.back': 'Volver al Inicio',
    'shared_workout.shared_on': 'Compartido el',
    'shared_workout.comments': 'Comentarios',
    'shared_workout.no_comments': 'Aún no hay comentarios. ¡Sé el primero en comentar!',
    'shared_workout.your_name': 'Tu nombre',
    'shared_workout.write_comment': 'Escribe un comentario...',
    'shared_workout.post_comment': 'Publicar Comentario',
    'shared_workout.not_logged': 'No registrado',
    'shared_workout.enter_name_comment': 'Por favor ingresa un nombre y comentario.',

    // Routine Details
    'routine_details.edit': 'Editar Rutina',
    'routine_details.copy': '📋 Copiar Rutina',
    'routine_details.delete': 'Eliminar Rutina',
    'routine_details.target_muscles': 'Músculos Objetivo',
    'routine_details.exercises_section': 'Ejercicios',
    'routine_details.unknown_exercise': 'Ejercicio Desconocido (ID: ',
    'routine_details.routine_copy_clipboard': '¡Rutina copiada al portapapeles!',
    'routine_details.routine_copy_failed': 'Error al copiar la rutina al portapapeles.',
    'routine_details.delete_confirm': '¿Estás seguro de que quieres eliminar ',
    'routine_details.delete_action': 'Esta acción no se puede deshacer.',
    'routine_details.delete_success': '¡Rutina eliminada exitosamente!',
    'routine_details.delete_error': 'Error al eliminar la rutina: ',

    // Builder
    'builder.back_routines': 'Volver a Rutinas',
    'builder.back_modules': 'Volver a Módulos',
    'builder.create_new': 'Crear Nueva Rutina',
    'builder.edit_routine': 'Editar Rutina',
    'builder.edit_module': 'Editar Módulo',
    'builder.routine_name': 'Nombre de la Rutina',
    'builder.module_name': 'Nombre del Módulo',
    'builder.enter_name': 'Ingresa nombre...',
    'builder.routine_details': 'Detalles de la Rutina',
    'builder.module_details': 'Detalles del Módulo',
    'builder.select_category': 'Seleccionar Categoría...',
    'builder.select_difficulty': 'Seleccionar Dificultad...',
    'builder.duration_minutes': 'Duración (minutos)',
    'builder.selected_exercises': 'Ejercicios Seleccionados (arrastrar para reordenar)',
    'builder.no_exercises_selected': 'No se han seleccionado ejercicios aún',
    'builder.select_exercises_desc': 'Selecciona ejercicios de la lista de abajo para construir tu rutina o módulo.',
    'builder.available_exercises': 'Ejercicios Disponibles',
    'builder.no_exercises_available': 'No hay ejercicios disponibles',
    'builder.search_available': 'Buscar ejercicios disponibles...',
    'builder.create_routine_btn': 'Crear Rutina',
    'builder.update_routine_btn': 'Actualizar Rutina',
    'builder.save_module_btn': 'Guardar Módulo',
    'builder.no_exercises_selected_yet': 'No se han seleccionado ejercicios aún.',
    'builder.remove_confirm': '¿Estás seguro de que quieres eliminar ',
    'builder.remove_from_routine': ' de esta rutina? Esto no eliminará el ejercicio.',
    'builder.enter_name_error': 'Por favor ingresa un nombre.',
    'builder.select_exercise_error': 'Por favor selecciona al menos un ejercicio.',
    'builder.enter_description_error': 'Por favor ingresa una descripción para la rutina.',
    'builder.module_updated': '¡Módulo actualizado exitosamente!',
    'builder.module_created': '¡Nuevo módulo creado exitosamente!',
    'builder.routine_created': '¡Nueva rutina creada y guardada exitosamente!',
    'builder.routine_error': 'Error al crear la rutina: ',
    'builder.routine_not_found': '¡Rutina no encontrada!',
    'builder.routine_updated': '¡Rutina actualizada y guardada exitosamente!',
    'builder.routine_update_error': 'Error al actualizar la rutina: ',
    'builder.save_error': 'Error al guardar el módulo: ',

    // Export/Import
    'export_import.header': 'Exportar e Importar',

    // Exercise Details
    'exercise_details.no_description': 'No hay descripción disponible.',
    'exercise_details.none_specified': 'Ninguno especificado',
    'exercise_details.image': 'imagen',
    'exercise_details.not_found': 'Ejercicio no encontrado.',
    'exercise_details.exercise_information': 'Información del Ejercicio',
    'exercise_details.progression_chain': 'Cadena de Progresión',
    'exercise_details.performance_history': 'Historial de Rendimiento',
    'exercise_details.muscle_engagement': 'Activación Muscular',
    'exercise_details.front_view': 'Vista Frontal',
    'exercise_details.back_view': 'Vista Posterior',
    'exercise_details.skill_level': 'Nivel de Habilidad: ',
    'exercise_details.equipment_label': 'Equipo: ',
    'exercise_details.categories_label': 'Categorías: ',
    'exercise_details.muscles_targeted': 'Músculos Objetivo: ',
    'exercise_details.form_cues_label': 'Indicaciones de Forma: ',
    'exercise_details.common_mistakes_label': 'Errores Comunes a Evitar: ',
    'exercise_details.prerequisites_label': 'Prerrequisitos: ',
    'exercise_details.progressions_label': 'Progresiones (Siguientes Pasos): ',
    'exercise_details.date_label': 'Fecha: ',
    'exercise_details.reps_label': 'Repeticiones Totales: ',
    'exercise_details.no_form_cues': 'No se proporcionaron indicaciones de forma',
    'exercise_details.no_common_mistakes': 'No se registraron errores comunes',
    'exercise_details.no_data': 'Sin datos',
    'exercise_details.prereq_none': 'Ninguno - este es un ejercicio inicial',
    'exercise_details.progression_none': 'Ninguno - ¡has dominado este ejercicio!',
    'exercise_details.favorite': 'Favorito',

    // Workout Completion
    'completion.unknown_exercise': 'Ejercicio Desconocido',
    'completion.unknown': 'Desconocido',

    // Workout Summary
    'summary.custom_workout': 'Entrenamiento Personalizado',

    // Skill Module Detail
    'skill_module_detail.no_description': 'No hay descripción disponible.',
    'skill_module_detail.na': 'N/A',
    'skill_module_detail.mixed': 'mezclado',

    // Skill Modules
    'skill_modules.uncategorized': 'Sin Categoría',

    // Onboarding
    'onboarding.name_validation': 'Por favor ingresa tu nombre.',
    'onboarding.welcome': 'Bienvenido a Dominio de Calistenia',

    // Data labels (dynamic)
    'data.pushup': 'Flexión',
    'data.dip': 'Fondo',
    'data.handstand': 'Pancada',
    'data.pullup': 'Dominada',
    'data.core': 'Core',
    'data.planche': 'Planche',
    'data.front_lever': 'Palanca Frontal',

    // Admin
    'admin.title': 'Administración de Módulos',
    'admin.create': 'Crear Módulo',

    // Upgrade prompt (SW update)
    'sw_update.message': 'Hay una nueva versión de la aplicación disponible. ¿Quieres actualizar?',
    'sw_update.yes': 'Actualizar',
    'sw_update.no': 'Ahora no',

    // Routine builder types
    'routine_type.push': 'Empuje',
    'routine_type.pull': 'Tracción',
    'routine_type.core': 'Core',
    'routine_type.legs': 'Piernas',
    'routine_type.cardio': 'Cardio',
    'routine_type.full_body': 'Cuerpo Completo',
    'routine_type.custom': 'Personalizado',

    // Difficulty labels
    'difficulty.beginner': 'Principiante',
    'difficulty.intermediate': 'Intermedio',
    'difficulty.advanced': 'Avanzado',
  }
};

/**
 * Get the current locale from localStorage, default to 'en'
 */
export function getLocale() {
  return localStorage.getItem('locale') || 'en';
}

/**
 * Set the locale and persist to localStorage
 * Also clears and reinitializes the data cache to load locale-specific data
 */
export function setLocale(locale) {
  if (!translations[locale]) {
    console.warn(`i18n: locale "${locale}" not supported, falling back to 'en'`);
    locale = 'en';
  }
  localStorage.setItem('locale', locale);
  // Update html lang attribute for accessibility
  document.documentElement.lang = locale;
  // Dispatch event so other components can react
  document.dispatchEvent(new CustomEvent('localeChange', { detail: { locale } }));
  
  // The actual data reload is handled by the localeChange event listener in main.js
  // This just removes the old dynamic import that caused 404s
}

/**
 * Get all available locales
 */
export function getAvailableLocales() {
  return Object.keys(translations).map(code => ({
    code,
    name: code === 'en' ? 'English' : 'Español'
  }));
}

/**
 * Translate a key with optional parameter interpolation
 * @param {string} key - The translation key (e.g., 'home.welcome')
 * @param {object} params - Optional parameters for interpolation (e.g., { name: 'John' })
 * @returns {string} The translated string
 */
export function t(key, params = {}) {
  const locale = getLocale();
  let text = translations[locale]?.[key];
  
  // Fallback to English if translation missing
  if (!text) {
    text = translations.en?.[key];
    if (!text) {
      console.warn(`i18n: missing translation for "${key}" in "${locale}"`);
      return key; // Return the key itself as fallback
    }
  }

  // Interpolate parameters: {{paramName}}
  Object.keys(params).forEach(param => {
    text = text.replace(new RegExp(`\\{\\{${param}\\}\\}`, 'g'), params[param]);
  });

  return text;
}

// Auto-detect locale from browser language on first load
(function autoDetectLocale() {
  if (!localStorage.getItem('locale')) {
    const browserLang = navigator.language || navigator.userLanguage || '';
    if (browserLang.startsWith('es')) {
      localStorage.setItem('locale', 'es');
    } else {
      localStorage.setItem('locale', 'en');
    }
  }
})();
