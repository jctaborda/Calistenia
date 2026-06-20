// views/skills-tree-view.js - Exercise progression tree visualization
import { renderHeader } from '../components/header.js';
import { t } from '../i18n.js';
import { getState } from '../services/state.js';
import { loadAllExercises, loadAllCategories, loadAllDifficulties } from '../services/data-cache.js';
import { fetchSkillModules } from '../services/api.js';

export async function renderSkillsTreeView() {
  const main = document.getElementById('app');
  const state = await getState();

  // Load data from cache layer (IndexedDB → in-memory)
  let exercisesData;
  let modulesData = [];

  // Calculate history early -- needed by exercise processing inside try block
  const history = state.history || [];
  function isExerciseCompleted(exerciseId) {
    for (const workout of history) {
      if (workout.exercises) {
        for (const ex of workout.exercises) {
          if (ex.exerciseId === exerciseId && ex.actualReps && ex.actualReps.some(r => r > 0)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  try {
    const exercisesArray = await loadAllExercises();
    const categories = await loadAllCategories();
    const difficulties = await loadAllDifficulties();

    // Load modules for per-module progress and prerequisites
    try {
      modulesData = await fetchSkillModules();
    } catch (err) {
      console.warn('Could not load skill modules for tree:', err);
    }

    // Create lookup maps for reference data
    const categoriesMap = {};
    const difficultiesMap = {};
    (categories || []).forEach(cat => {
      categoriesMap[cat.id] = cat.name;
    });
    (difficulties || []).forEach(diff => {
      difficultiesMap[String(diff.id)] = diff.name;
      difficultiesMap[diff.id] = diff.name;
    });

    // Build module exercise set for per-module progress
    const moduleExerciseMap = {};
    modulesData.forEach(mod => {
      moduleExerciseMap[mod.id] = {
        exerciseIds: new Set(mod.exercises || []),
        prerequisites: mod.prerequisites || [],
        name: mod.name
      };
    });

    // Find which modules each exercise belongs to
    const exerciseToModules = {};
    modulesData.forEach(mod => {
      (mod.exercises || []).forEach(exId => {
        if (!exerciseToModules[exId]) exerciseToModules[exId] = [];
        exerciseToModules[exId].push(mod);
      });
    });

    // Transform exercises array into nodes format for tree visualization
    exercisesData = {
      nodes: exercisesArray.map(ex => {
        const categoryIds = ex.categories || [];
        const difficultyIds = ex.difficulty || [];

        const categoryName = categoryIds.length > 0
          ? categoriesMap[categoryIds[0]] || t('skills_tree.undefined')
          : t('skills_tree.undefined');

        // Fix #9: Normalize difficulty string matching (type-safe)
        const difficultyName = difficultyIds.length > 0
          ? difficultiesMap[String(difficultyIds[0])] || difficultiesMap[difficultyIds[0]] || 'intermediate'
          : 'intermediate';

        // Fix #7: Per-module progress for this exercise
        const associatedModules = exerciseToModules[ex.id] || [];
        const moduleProgress = associatedModules.map(mod => {
          const modExercises = moduleExerciseMap[mod.id].exerciseIds;
          const completedCount = [...modExercises].filter(eId => isExerciseCompleted(eId)).length;
          return { moduleId: mod.id, progress: Math.round((completedCount / modExercises.size) * 100) };
        });

        return {
          id: `exercise-${ex.id}`,
          exerciseId: ex.id,
          name: ex.name,
          category: categoryName,
          difficulty: difficultyName,
          skill: ex.skill || 'Basic Skills',
          prerequisites: ex.prerequisites || [],
          unlocks: ex.progressions || [],
          description: ex.description || '',
          moduleProgress: moduleProgress,
          associatedModuleIds: associatedModules.map(m => m.id)
        };
      })
    };
  } catch (error) {
    console.error('Skills tree render error:', error);
    const mainEl = document.getElementById('app');
    if (mainEl) {
      mainEl.innerHTML = renderHeader() + `
      <div class="card">
        <h1>${t('skills_tree.title')}</h1>
        <p class="error-message">${t('skills_tree.load_error')}</p>
      </div>
    `;
    }
    return;
  }

  // Fix #3: Module completion status (all exercises completed = module complete)
  const moduleCompletionStatus = {};
  modulesData.forEach(mod => {
    const exIds = mod.exercises || [];
    moduleCompletionStatus[mod.id] = exIds.length > 0 && exIds.every(eId => isExerciseCompleted(eId));
  });

  function getNodeProgress(node) {
    if (node.prerequisites && node.prerequisites.length > 0) {
      for (const prereqId of node.prerequisites) {
        const prereqNode = exercisesData.nodes.find(n => n.exerciseId === prereqId);
        if (!prereqNode) continue;
        if (prereqNode.exerciseId && !isExerciseCompleted(prereqNode.exerciseId)) {
          return 0;
        }
      }
    }
    if (node.exerciseId) {
      return isExerciseCompleted(node.exerciseId) ? 1 : 0;
    }
    return 0;
  }

  function findNextExercises() {
    const nextExercises = new Set();
    modulesData.forEach(mod => {
      const exerciseIds = mod.exercises || [];
      for (const exId of exerciseIds) {
        const node = exercisesData.nodes.find(n => n.exerciseId === exId);
        if (!node) continue;
        const prereqsDone = node.prerequisites.every(prereqId => {
          const prereqNode = exercisesData.nodes.find(n => n.exerciseId === prereqId);
          return !prereqNode || isExerciseCompleted(prereqNode.exerciseId);
        });
        if (prereqsDone && !isExerciseCompleted(exId)) {
          nextExercises.add(exId);
          break; // First unlockable in this module
        }
      }
    });
    return nextExercises;
  }

  const nextExercises = findNextExercises();

  // Calculate overall progress
  const completedNodes = exercisesData.nodes.filter(node => getNodeProgress(node) === 1).length;
  const totalNodes = exercisesData.nodes.length;
  const overallProgress = totalNodes > 0 ? Math.round((completedNodes / totalNodes) * 100) : 0;

  // Fix #5: Filter state
  let activeCategoryFilter = null;
  let activeDifficultyFilter = null;
  let searchQuery = '';

  function getFilteredNodes() {
    return exercisesData.nodes.filter(node => {
      if (activeCategoryFilter && node.category !== activeCategoryFilter) return false;
      if (activeDifficultyFilter && node.difficulty !== activeDifficultyFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!node.name.toLowerCase().includes(q) && !node.category.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }

  // Generate tree visualization using HTML/SVG with improved layout
  function renderTreeVisualization() {
    const filteredNodes = getFilteredNodes();
    const nodeMap = {};
    filteredNodes.forEach(n => { nodeMap[n.exerciseId] = n; });

    // Compute depth = longest path from any root (node with no prereqs) to this node
    // Using memoization with cycle detection (prereq cycles break recursion)
    const depthCache = {};
    const visiting = new Set();
    function computeDepth(nodeId) {
      if (depthCache[nodeId] !== undefined) return depthCache[nodeId];
      if (visiting.has(nodeId)) {
        // Cycle detected — stop recursion
        depthCache[nodeId] = 0;
        return 0;
      }
      visiting.add(nodeId);
      const node = nodeMap[nodeId];
      if (!node || !node.prerequisites || node.prerequisites.length === 0) {
        visiting.delete(nodeId);
        depthCache[nodeId] = 0;
        return 0;
      }
      let maxD = -1;
      for (const prereqId of node.prerequisites) {
        if (nodeMap[prereqId]) {
          maxD = Math.max(maxD, computeDepth(prereqId));
        }
      }
      visiting.delete(nodeId);
      depthCache[nodeId] = maxD + 1;
      return depthCache[nodeId];
    }
    filteredNodes.forEach(n => computeDepth(n.exerciseId));

    // Group nodes by depth level
    const depthGroups = {};
    filteredNodes.forEach(node => {
      const d = depthCache[node.exerciseId] || 0;
      if (!depthGroups[d]) depthGroups[d] = [];
      depthGroups[d].push(node);
    });

    // Sort each group: completed first, then by name
    Object.values(depthGroups).forEach(group => {
      group.sort((a, b) => {
        const aDone = getNodeProgress(a) === 1;
        const bDone = getNodeProgress(b) === 1;
        if (aDone !== bDone) return bDone - aDone;
        return a.name.localeCompare(b.name);
      });
    });

    // Layout constants
    const NODE_SPACING_X = 300;
    const NODE_SPACING_Y = 55;
    const MODULE_GAP = 30;
    const PADDING = 40;

    const depthKeys = Object.keys(depthGroups).map(Number).sort((a, b) => a - b);
    const maxDepth = depthKeys.length > 0 ? depthKeys[depthKeys.length - 1] : 0;

    // Calculate SVG dimensions with room for all nodes
    const svgWidth = (maxDepth + 1) * NODE_SPACING_X + PADDING * 2;
    const svgHeight = Math.max(500, filteredNodes.length * NODE_SPACING_Y + PADDING * 3);

    // Store node positions for connection drawing
    const nodePositions = {};

    // Assign each node to module clusters for better grouping
    // Nodes are grouped by their associated module so related exercises stay close
    const nodeModuleAssignment = {};
    filteredNodes.forEach(node => {
      const moduleIds = node.associatedModuleIds || [];
      if (moduleIds.length > 0) {
        // Assign to the module with the highest progress (most "anchored" module)
        const moduleProgress = node.moduleProgress || [];
        if (moduleProgress.length > 0) {
          moduleProgress.sort((a, b) => b.progress - a.progress);
          nodeModuleAssignment[node.exerciseId] = moduleProgress[0].moduleId;
        } else {
          nodeModuleAssignment[node.exerciseId] = moduleIds[0];
        }
      }
    });

    // Generate nodes with module-aware positioning
    function generateNodesSVG() {
      const svgNodes = [];

      depthKeys.forEach(depth => {
        const group = depthGroups[depth];

        // Group nodes by module at this depth level
        const moduleGroups = {};
        const orphans = [];
        group.forEach(node => {
          const modId = nodeModuleAssignment[node.exerciseId];
          if (modId) {
            if (!moduleGroups[modId]) moduleGroups[modId] = [];
            moduleGroups[modId].push(node);
          } else {
            orphans.push(node);
          }
        });

        // Sort modules by their average progress (descending) so most-advanced modules are first
        const moduleOrder = Object.keys(moduleGroups).sort((a, b) => {
          const aProg = moduleGroups[a].reduce((s, n) => s + (getNodeProgress(n) || 0), 0) / moduleGroups[a].length;
          const bProg = moduleGroups[b].reduce((s, n) => s + (getNodeProgress(n) || 0), 0) / moduleGroups[b].length;
          return bProg - aProg;
        });

        // Calculate Y offsets: modules placed sequentially, orphans at the end
        let yOffset = PADDING;

        // Place module groups
        moduleOrder.forEach(modId => {
          const modNodes = moduleGroups[modId];
          // Sort: completed first, then by name
          modNodes.sort((a, b) => {
            const aDone = getNodeProgress(a) === 1;
            const bDone = getNodeProgress(b) === 1;
            if (aDone !== bDone) return bDone - aDone;
            return a.name.localeCompare(b.name);
          });
          modNodes.forEach((node, index) => {
            const x = depth * NODE_SPACING_X + PADDING + NODE_SPACING_X / 2;
            const y = yOffset + index * NODE_SPACING_Y + NODE_SPACING_Y / 2;
            nodePositions[node.exerciseId] = { x, y };
          });
          yOffset += modNodes.length * NODE_SPACING_Y + MODULE_GAP;
        });

        // Place orphans (nodes without module assignment)
        orphans.sort((a, b) => {
          const aDone = getNodeProgress(a) === 1;
          const bDone = getNodeProgress(b) === 1;
          if (aDone !== bDone) return bDone - aDone;
          return a.name.localeCompare(b.name);
        });
        orphans.forEach((node, index) => {
          const x = depth * NODE_SPACING_X + PADDING + NODE_SPACING_X / 2;
          const y = yOffset + index * NODE_SPACING_Y + NODE_SPACING_Y / 2;
          nodePositions[node.exerciseId] = { x, y };
        });

        // Now generate SVG elements for all nodes at this depth
        group.forEach(node => {
          const pos = nodePositions[node.exerciseId];
          if (!pos) return;
          const { x, y } = pos;

          const progress = getNodeProgress(node);
          const isCompleted = progress === 1;
          const canUnlock = node.prerequisites.every(prereqId => {
            const prereqNode = nodeMap[prereqId];
            if (!prereqNode) return true;
            return getNodeProgress(prereqNode) === 1;
          });
          const isNext = nextExercises.has(node.exerciseId);

          const overallModuleProgress = node.moduleProgress.length > 0
            ? Math.round(node.moduleProgress.reduce((sum, m) => sum + m.progress, 0) / node.moduleProgress.length)
            : 0;

          let strokeColor, fillColor;
          if (isCompleted) {
            strokeColor = '#4CAF50';
            fillColor = '#C8E6C9';
          } else if (canUnlock) {
            strokeColor = '#FF9800';
            fillColor = '#FFF3E0';
          } else {
            const prereqStatus = node.prerequisites && node.prerequisites.some(prereqId => {
              const prereqNode = nodeMap[prereqId];
              return prereqNode && getNodeProgress(prereqNode) !== 1;
            });
            strokeColor = prereqStatus ? '#9E9E9E' : '#2196F3';
            fillColor = '#E3F2FD';
          }

          const radius = 20;
          const labelY = y + 45;

          const tooltipData = `data-tooltip-name="${node.name}" data-tooltip-category="${node.category}" data-tooltip-module-progress="${JSON.stringify(node.moduleProgress.map(m => m.progress).join(', '))}"`;

          const pulseRing = isNext ? `
            <circle cx="${x}" cy="${y}" r="${radius + 8}" fill="none" stroke="#FF9800" stroke-width="2" stroke-dasharray="4,3">
              <animate attributeName="r" values="${radius + 4};${radius + 10};${radius + 4}" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
            </circle>
          ` : '';

          const progressRing = !isCompleted && node.moduleProgress.length > 0 ? `
            <circle cx="${x}" cy="${y}" r="${radius - 4}" fill="none" stroke="#2196F3" stroke-width="2"
              stroke-dasharray="${Math.round(overallModuleProgress / 100 * 2 * Math.PI * (radius - 4))} ${2 * Math.PI * (radius - 4)}"
              transform="rotate(-90 ${x} ${y})"
              opacity="0.6"/>
          ` : '';

          svgNodes.push(`
            <g class="node" data-node-id="${node.exerciseId}" ${tooltipData}>
              ${isCompleted ? `
                <circle cx="${x}" cy="${y}" r="${radius + 5}" fill="none" stroke="#4CAF50" stroke-width="3"/>
              ` : ''}
              ${pulseRing}
              <circle
                cx="${x}"
                cy="${y}"
                r="${radius}"
                fill="${fillColor}"
                stroke="${strokeColor}"
                stroke-width="2.5"
                class="progress-circle"
              />
              ${progressRing}
              ${isCompleted ? `
                <text x="${x}" y="${y + 3}" text-anchor="middle" font-size="12" fill="#4CAF50" font-weight="bold">✅</text>
              ` : isNext ? `
                <text x="${x}" y="${y + 3}" text-anchor="middle" font-size="10" fill="#FF9800" font-weight="bold">→</text>
              ` : ''}
              <text
                x="${x}"
                y="${labelY}"
                text-anchor="middle"
                font-size="11"
                fill="#333"
                font-weight="500"
                class="exercise-label"
                class="pointer-events-none"
              >${node.name}</text>
              <title>${node.name} (${node.category})${isCompleted ? ' - Completed' : ''}${isNext ? ' - Next Exercise' : ''}</title>
            </g>
          `);
        });
      });

      return svgNodes.join('');
    }

    // Generate prerequisite connections using cubic bezier curves for smoother lines
    function generateConnectionsSVG() {
      const connectionLines = [];

      // Exercise-level prerequisite lines (curved bezier)
      filteredNodes.forEach(node => {
        if (!node.prerequisites || node.prerequisites.length === 0) return;
        const targetPos = nodePositions[node.exerciseId];
        if (!targetPos) return;

        node.prerequisites.forEach(prereqId => {
          const sourcePos = nodePositions[prereqId];
          if (!sourcePos) return;

          // Use cubic bezier curve: control points spread horizontally
          const dx = targetPos.x - sourcePos.x;
          const cp1x = sourcePos.x + dx * 0.5;
          const cp1y = sourcePos.y;
          const cp2x = targetPos.x - dx * 0.5;
          const cp2y = targetPos.y;

          const isCompleted = isExerciseCompleted(node.exerciseId) && isExerciseCompleted(prereqId);

          connectionLines.push(`
            <path
              d="M ${sourcePos.x} ${sourcePos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetPos.x} ${targetPos.y}"
              stroke="${isCompleted ? '#4CAF50' : '#4CAF50'}"
              stroke-width="${isCompleted ? '2.5' : '1.5'}"
              stroke-dasharray="${isCompleted ? 'none' : '5,5'}"
              fill="none"
              opacity="0.5"
            />
          `);
        });
      });

      // Module-level prerequisite lines (dashed, purple, curved)
      modulesData.forEach(mod => {
        if (!mod.prerequisites || mod.prerequisites.length === 0) return;

        mod.prerequisites.forEach(prereqModId => {
          const prereqMod = modulesData.find(m => m.id === prereqModId);
          if (!prereqMod) return;

          const targetExId = mod.exercises && mod.exercises[0];
          const sourceExId = prereqMod.exercises && prereqMod.exercises[0];
          if (!targetExId || !sourceExId) return;

          const targetPos = nodePositions[targetExId];
          const sourcePos = nodePositions[sourceExId];
          if (!targetPos || !sourcePos) return;
          if (!nodeMap[targetExId] || !nodeMap[sourceExId]) return;

          const isPrereqComplete = moduleCompletionStatus[prereqModId];

          const dx = targetPos.x - sourcePos.x;
          const cp1x = sourcePos.x + dx * 0.5;
          const cp1y = sourcePos.y;
          const cp2x = targetPos.x - dx * 0.5;
          const cp2y = targetPos.y;

          connectionLines.push(`
            <path
              d="M ${sourcePos.x} ${sourcePos.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${targetPos.x} ${targetPos.y}"
              stroke="${isPrereqComplete ? '#9C27B0' : '#CE93D8'}"
              stroke-width="3"
              stroke-dasharray="8,4"
              fill="none"
              opacity="${isPrereqComplete ? '0.5' : '0.3'}"
            />
          `);
        });
      });

      return connectionLines.join('');
    }

    // Generate name labels outside SVG
    function generateLabels() {
      const labels = [];

      depthKeys.forEach(depth => {
        const group = depthGroups[depth];
        group.forEach((node, index) => {
          const pos = nodePositions[node.exerciseId];
          if (!pos) return;
          const x = pos.x;
          const y = pos.y;

          labels.push(`
            <div class="tree-label" style="transform: translate(${x}px, ${y}px);" data-node-id="${node.exerciseId}">
              <div class="label-content">
                <strong>${node.name}</strong>
                <small>${node.category.charAt(0).toUpperCase() + node.category.slice(1)}</small>
                <a href="#exercise/${node.exerciseId}" class="tree-link">View Exercise →</a>
              </div>
            </div>
          `);
        });
      });

      return labels.join('');
    }

    return {
      width: svgWidth,
      height: svgHeight,
      nodes: generateNodesSVG(),
      connections: generateConnectionsSVG(),
      labels: generateLabels()
    };
  }

  const treeLayout = renderTreeVisualization();

  // Get unique categories for filter
  const allCategories = [...new Set(exercisesData.nodes.map(n => n.category))].sort();

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div class="flex-between mb-1rem">
        <h1>${t('skills_tree.exercise_progression')}</h1>
        <span style="font-size: 1.5rem; font-weight: bold; color: ${overallProgress >= 80 ? '#4CAF50' : '#2196F3'}">
          ${overallProgress}% Complete (${completedNodes}/${totalNodes} exercises)
        </span>
      </div>

      <!-- Fix #5: Filter/Search toolbar -->
      <div class="filter-toolbar" style="display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 1.5rem; align-items: center;">
        <input type="text" id="tree-search" placeholder="${t('exercises.search') || 'Search exercises...'}" style="flex: 1; min-width: 200px; padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
        <select id="tree-category-filter" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
          <option value="">${t('skills_tree.all_categories') || 'All Categories'}</option>
          ${allCategories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        </select>
        <select id="tree-difficulty-filter" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
          <option value="">${t('skills_tree.all_difficulties') || 'All Difficulties'}</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
        <button id="tree-reset-filters" class="btn btn-secondary btn-sm">${t('common.clear') || 'Clear'}</button>
      </div>

      <p style="color: var(--text-secondary); margin-bottom: 2rem;">
        Visual progression path organized by prerequisite chains (left to right).
        Green = Completed, Orange = Ready to unlock (→ = next exercise), Gray = Prerequisites required, Blue = Available.
        Purple dashed lines = Module dependencies (color intensity = prerequisite module completion).
      </p>

      <div class="overflow-scroll">
        <svg width="${treeLayout.width}" height="${treeLayout.height}" id="skills-tree-svg" style="min-width: ${treeLayout.width}px;">
          ${treeLayout.connections}
          ${treeLayout.nodes}
        </svg>
      </div>

      <div id="skills-tree-labels" class="overflow-scroll-short">
        ${treeLayout.labels}
      </div>

      <div class="card legend-card" class="mt-2rem legend-card">
        <h3>Legend</h3>
        <div class="flex-gap-xl">
          <div class="flex-center-gap">
            <div class="legend-item completed"></div>
            <span>Completed</span>
          </div>
          <div class="flex-center-gap">
            <div class="legend-item unlockable"></div>
            <span>Ready to Unlock</span>
          </div>
          <div class="flex-center-gap">
            <div class="legend-item prereq-required"></div>
            <span>Prerequisites Required</span>
          </div>
          <div class="flex-center-gap">
            <div class="legend-item available"></div>
            <span>Available</span>
          </div>
          <div class="flex-center-gap">
            <div class="legend-item next-exercise" style="border: 2px solid #FF9800; border-radius: 50%; width: 16px; height: 16px; position: relative;">
              <span style="position: absolute; top: -2px; left: 4px; font-size: 10px;">→</span>
            </div>
            <span>Next Exercise</span>
          </div>
          <div class="flex-center-gap">
            <div style="width: 20px; height: 3px; background: #9C27B0; border-radius: 2px;"></div>
            <span>Module Complete</span>
          </div>
          <div class="flex-center-gap">
            <div style="width: 20px; height: 3px; background: #CE93D8; border-radius: 2px; opacity: 0.6;"></div>
            <span>Module Incomplete</span>
          </div>
        </div>
      </div>

      <button class="btn mt-2rem" data-nav="#skill-modules">${t('skills.back')}</button>
    </div>
  `;

  // Fix #10: Keyboard navigation
  let focusedNodeIndex = -1;
  const allNodes = exercisesData.nodes;

  function focusNode(index) {
    if (index < 0 || index >= allNodes.length) return;
    focusedNodeIndex = index;
    const nodeId = allNodes[index].exerciseId;
    const nodeEl = document.querySelector(`.node[data-node-id="${nodeId}"]`);
    if (nodeEl) {
      nodeEl.setAttribute('tabindex', '0');
      nodeEl.style.outline = '2px solid #FF9800';
      nodeEl.style.outlineOffset = '2px';
    }
  }

  function clearFocus() {
    document.querySelectorAll('.node[tabindex="0"]').forEach(el => {
      el.removeAttribute('tabindex');
      el.style.outline = '';
      el.style.outlineOffset = '';
    });
    focusedNodeIndex = -1;
  }

  document.addEventListener('keydown', (e) => {
    const svg = document.getElementById('skills-tree-svg');
    if (!svg) return;

    // Only handle if not typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      if (focusedNodeIndex < 0) focusedNodeIndex = 0;
      else focusedNodeIndex = (focusedNodeIndex + 1) % allNodes.length;
      focusNode(focusedNodeIndex);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (focusedNodeIndex < 0) focusedNodeIndex = allNodes.length - 1;
      else focusedNodeIndex = (focusedNodeIndex - 1 + allNodes.length) % allNodes.length;
      focusNode(focusedNodeIndex);
    } else if (e.key === 'Enter' && focusedNodeIndex >= 0) {
      e.preventDefault();
      const nodeId = allNodes[focusedNodeIndex].exerciseId;
      window.location.hash = `#exercise/${nodeId}`;
    } else if (e.key === 'Escape') {
      clearFocus();
    }
  });

  // Add click handlers for nodes
  const svg = document.getElementById('skills-tree-svg');
  if (svg) {
    svg.addEventListener('click', (e) => {
      const nodeGroup = e.target.closest('.node');
      if (nodeGroup) {
        const exerciseId = nodeGroup.getAttribute('data-node-id');
        window.location.hash = `#exercise/${exerciseId}`;
      }
    });
  }

  // Fix #5: Filter/Search event listeners
  const searchInput = document.getElementById('tree-search');
  const categoryFilter = document.getElementById('tree-category-filter');
  const difficultyFilter = document.getElementById('tree-difficulty-filter');
  const resetBtn = document.getElementById('tree-reset-filters');

  function applyFilters() {
    searchQuery = searchInput?.value?.trim() || '';
    activeCategoryFilter = categoryFilter?.value || null;
    activeDifficultyFilter = difficultyFilter?.value || null;

    const newLayout = renderTreeVisualization();
    const svgEl = document.getElementById('skills-tree-svg');
    if (svgEl) {
      svgEl.innerHTML = newLayout.connections + newLayout.nodes;
      svgEl.setAttribute('width', newLayout.width);
      svgEl.setAttribute('height', newLayout.height);
    }
    const labelsEl = document.getElementById('skills-tree-labels');
    if (labelsEl) {
      labelsEl.innerHTML = newLayout.labels;
    }
  }

  if (searchInput) searchInput.addEventListener('input', applyFilters);
  if (categoryFilter) categoryFilter.addEventListener('change', applyFilters);
  if (difficultyFilter) difficultyFilter.addEventListener('change', applyFilters);
  if (resetBtn) resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    categoryFilter.value = '';
    difficultyFilter.value = '';
    applyFilters();
  });
}

// Export for router usage
// Named + default export for maximum flexibility (Pattern 3)
export default { render: renderSkillsTreeView };
