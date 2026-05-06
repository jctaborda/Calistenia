import { renderHeader } from '../components/header.js';
import { getState } from '../services/state.js';

export async function renderSkillsTreeView() {
  const main = document.getElementById('app');
  const state = await getState();
  
  // Load exercises with reference data lookup
  let exercisesData;
  try {
    // Fetch both exercises and reference data (categories, difficulties, equipment)
    const response = await fetch('./data/data.json');
    if (!response.ok) throw new Error('Failed to load data');
    const data = await response.json();
    
    const exercisesArray = data.exercises || [];
    const categoriesMap = {};
    const difficultiesMap = {};
    
    // Create lookup maps for reference data
    (data.categories || []).forEach(cat => {
      categoriesMap[cat.id] = cat.name;
    });
    
    (data.difficulties || []).forEach(diff => {
      difficultiesMap[diff.id] = diff.name;
    });
    
    // Transform exercises array into nodes format for tree visualization
    exercisesData = {
      nodes: exercisesArray.map(ex => {
        // Use first category or difficulty if available, otherwise default
        const categoryIds = ex.categories || [];
        const difficultyIds = ex.difficulty || [];
        
        const categoryName = categoryIds.length > 0 
          ? categoriesMap[categoryIds[0]] || 'Undefined'
          : 'Undefined';
        
        const difficultyName = difficultyIds.length > 0
          ? difficultiesMap[difficultyIds[0]] || 'intermediate'
          : 'intermediate';
        
        return {
          id: `exercise-${ex.id}`,
          exerciseId: ex.id,
          name: ex.name,
          category: categoryName, // string now
          difficulty: difficultyName, // string for sorting
          skill: ex.skill || 'Basic Skills',
          prerequisites: ex.prerequisites || [],
          unlocks: ex.progressions || [],
          description: ex.description || ''
        };
      })
    };
  } catch (error) {
    main.innerHTML = renderHeader() + `
      <div class="card">
        <h1>Skill Tree</h1>
        <p class="error-message">Unable to load exercises. Please try again later.</p>
      </div>
    `;
    return;
  }

  const history = state.history || [];
  
  // Calculate progress for each node
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

  function getNodeProgress(node) {
    // Check if all prerequisites are completed
    if (node.prerequisites && node.prerequisites.length > 0) {
      for (const prereqId of node.prerequisites) {
        const prereqNode = exercisesData.nodes.find(n => n.exerciseId === prereqId);
        if (!prereqNode) continue;
        
        if (prereqNode.exerciseId) {
          if (!isExerciseCompleted(prereqNode.exerciseId)) {
            return 0; // Prerequisite not done
          }
        }
      }
    }
    
    // If node has exercise, check if it's completed
    if (node.exerciseId) {
      return isExerciseCompleted(node.exerciseId) ? 1 : 0;
    }
    
    return 0;
  }

  // Find root nodes (no prerequisites)
  function findRootNodes() {
    return exercisesData.nodes.filter(node => {
      if (!node.prerequisites || node.prerequisites.length === 0) return true;
      return false;
    });
  }

  // Sort nodes by category difficulty
  const difficultyOrder = { 'beginner': 1, 'intermediate': 2, 'advanced': 3 };
  
  function getDepth(node) {
    // Depth based on difficulty level (not category)
    return difficultyOrder[node.difficulty] || difficultyOrder['intermediate'];
  }

  // Calculate overall progress
  const completedNodes = exercisesData.nodes.filter(node => getNodeProgress(node) === 1).length;
  const totalNodes = exercisesData.nodes.length;
  const overallProgress = Math.round((completedNodes / totalNodes) * 100);

  // Generate tree visualization using HTML/SVG
  function renderTreeVisualization() {
    const rootNodes = findRootNodes();
    
    // Group nodes by difficulty (depth)
    const depthGroups = {};
    
    exercisesData.nodes.forEach(node => {
      const depth = getDepth(node);
      if (!depthGroups[depth]) depthGroups[depth] = [];
      depthGroups[depth].push(node);
    });

    // Sort nodes within each group by name
    Object.values(depthGroups).forEach(group => {
      group.sort((a, b) => a.name.localeCompare(b.name));
    });

    // Create SVG container with calculated dimensions
    const maxDepth = Math.max(...Object.keys(depthGroups).map(Number));
    const nodesPerDepth = Object.values(depthGroups).map(g => g.length);
    const maxNodesInDepth = Math.max(...nodesPerDepth, 5);
    
    const svgWidth = (maxDepth + 1) * 250;
    const svgHeight = Math.max(600, maxNodesInDepth * 100 + 200);

    // Generate SVG paths for connections (prerequisites)
    function generateConnectionsSVG() {
      const connectionLines = [];
      
      exercisesData.nodes.forEach(node => {
        if (node.prerequisites && node.prerequisites.length > 0) {
          const targetDepth = getDepth(node);
          const targetX = targetDepth * 250 + 125;
          
          // Find position in target group
          const targetGroup = depthGroups[targetDepth];
          const targetIndex = targetGroup ? targetGroup.indexOf(node) : 0;
          const targetY = targetIndex * 100 + 50;
          
          node.prerequisites.forEach(prereqId => {
            const prereqNode = exercisesData.nodes.find(n => n.exerciseId === prereqId);
            if (!prereqNode) return;
            
            const sourceDepth = getDepth(prereqNode);
            const sourceX = sourceDepth * 250 + 125;
            const sourceGroup = depthGroups[sourceDepth];
            const sourceIndex = sourceGroup ? sourceGroup.indexOf(prereqNode) : 0;
            const sourceY = sourceIndex * 100 + 50;
            
            connectionLines.push(`
              <line 
                x1="${sourceX}" y1="${sourceY}"
                x2="${targetX}" y2="${targetY}"
                stroke="#4CAF50"
                stroke-width="2"
                stroke-dasharray="5,5"
                opacity="0.6"
              />
            `);
          });
        }
      });
      
      return connectionLines.join('');
    }

    // Generate nodes SVG elements WITH inline text labels
    function generateNodesSVG() {
      const svgNodes = [];
      
      Object.keys(depthGroups).forEach(depthStr => {
        const depth = Number(depthStr);
        const group = depthGroups[depth];
        
        group.forEach((node, index) => {
          const x = depth * 250 + 125;
          const y = index * 100 + 50;
          
          // Calculate progress for styling
          const progress = getNodeProgress(node);
          const isCompleted = progress === 1;
          const canUnlock = node.prerequisites.every(prereqId => {
            const prereqNode = exercisesData.nodes.find(n => n.exerciseId === prereqId);
            if (!prereqNode) return true;
            return getNodeProgress(prereqNode) === 1;
          });
          
          // Color coding by difficulty level
          let strokeColor, fillColor;
          if (isCompleted) {
            strokeColor = '#4CAF50';
            fillColor = '#C8E6C9';
          } else if (canUnlock) {
            strokeColor = '#FF9800';
            fillColor = '#FFF3E0';
          } else {
            const prereqStatus = node.prerequisites && node.prerequisites.some(prereqId => {
              const prereqNode = exercisesData.nodes.find(n => n.exerciseId === prereqId);
              return prereqNode && getNodeProgress(prereqNode) !== 1;
            });
            strokeColor = prereqStatus ? '#9E9E9E' : '#2196F3';
            fillColor = '#E3F2FD';
          }
          
          const radius = 20;
          const labelY = y + 45; // Position text below the circle
          
          svgNodes.push(`
            <g class="node" data-node-id="${node.exerciseId}" style="cursor: pointer;">
              ${isCompleted ? `
                <circle cx="${x}" cy="${y}" r="${radius + 5}" fill="none" stroke="#4CAF50" stroke-width="3"/>
              ` : ''}
              
              <circle 
                cx="${x}" 
                cy="${y}" 
                r="${radius}" 
                fill="${fillColor}" 
                stroke="${strokeColor}" 
                stroke-width="2.5"
                class="progress-circle"
              />
              
              ${isCompleted ? `
                <text x="${x}" y="${y + 3}" text-anchor="middle" font-size="12" fill="#4CAF50" font-weight="bold">✓</text>
              ` : ''}
              
              <!-- Exercise name label below circle -->
              <text 
                x="${x}" 
                y="${labelY}" 
                text-anchor="middle" 
                font-size="11" 
                fill="#333" 
                font-weight="500"
                class="exercise-label"
                style="pointer-events: none;"
              >${node.name}</text>
              
              <title>${node.name} (${node.category})${isCompleted ? ' - Completed' : ''}</title>
            </g>
          `);
        });
      });
      
      return svgNodes.join('');
    }

    // Generate name labels outside SVG
    function generateLabels() {
      const labels = [];
      
      Object.keys(depthGroups).forEach(depthStr => {
        const depth = Number(depthStr);
        const group = depthGroups[depth];
        
        group.forEach((node, index) => {
          const x = depth * 250 + 125;
          const y = index * 100 + 50;
          
          labels.push(`
            <div class="tree-label" style="transform: translate(${x}px, ${y}px);" data-node-id="${node.exerciseId}">
              <div class="label-content">
                <strong>${node.name}</strong>
                <small>${node.category.charAt(0).toUpperCase() + node.category.slice(1)}</small>
                <a href="#exercise/${node.exerciseId}" style="color: #2196F3; display: block; margin-top: 4px;">View Exercise →</a>
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
      connections: generateConnectionsSVG(),
      nodes: generateNodesSVG(),
      labels: generateLabels()
    };
  }

  const treeLayout = renderTreeVisualization();

  main.innerHTML = renderHeader() + `
    <div class="card">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
        <h1>Exercise Progression Tree</h1>
        <span style="font-size: 1.5rem; font-weight: bold; color: ${overallProgress >= 80 ? '#4CAF50' : '#2196F3'}">
          ${overallProgress}% Complete (${completedNodes}/${totalNodes} exercises)
        </span>
      </div>
      
      <p style="color: var(--text-secondary); margin-bottom: 2rem;">
        Visual progression path showing all exercises organized by difficulty. 
        Green = Completed, Orange = Ready to unlock, Gray = Prerequisites required, Blue = Available.
      </p>
      
      <div style="overflow-x: auto; overflow-y: auto; max-height: 70vh;">
        <svg width="${treeLayout.width}" height="${treeLayout.height}" id="skills-tree-svg" style="min-width: ${treeLayout.width}px;">
          ${treeLayout.connections}
          ${treeLayout.nodes}
        </svg>
      </div>
      
      <div id="skills-tree-labels" style="position: relative; overflow-x: auto; overflow-y: auto; max-height: 30vh;">
        ${treeLayout.labels}
      </div>
      
      <div class="card" style="margin-top: 2rem; background: var(--gray-100);">
        <h3>Legend</h3>
        <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #C8E6C9; border: 3px solid #4CAF50;"></div>
            <span>Completed</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #FFF3E0; border: 2.5px solid #FF9800;"></div>
            <span>Ready to Unlock</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #E3F2FD; border: 2.5px solid #9E9E9E;"></div>
            <span>Prerequisites Required</span>
          </div>
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #E3F2FD; border: 2.5px solid #2196F3;"></div>
            <span>Available</span>
          </div>
        </div>
      </div>
      
      <button class="btn" onclick="window.location.hash = '#skill-modules'" style="margin-top: 2rem;">Back to Modules List</button>
    </div>
    
    <style>
      #skills-tree-svg {
        border: 1px solid var(--gray-300);
        border-radius: 8px;
        background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      }
      
      .tree-label {
        position: absolute;
        transform-origin: center;
        pointer-events: none;
        width: 180px;
        margin-left: -90px;
        z-index: 10;
      }
      
      .label-content {
        background: white;
        padding: 0.75rem;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        font-size: 0.75rem;
        line-height: 1.4;
        text-align: center;
        white-space: nowrap;
      }
      
      .node:hover circle {
        stroke: #FF9800 !important;
        stroke-width: 3px !important;
        cursor: pointer;
      }
      
      /* Exercise name labels below circles */
      .exercise-label {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        text-shadow: 0 1px 2px rgba(255,255,255,0.8);
        fill: #333 !important;
        font-weight: 600;
      }
      
      /* Ensure labels wrap nicely for long names */
      text {
        user-select: none;
        -webkit-user-select: none;
      }
    </style>
  `;

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
}

// Export for router usage
window.renderSkillsTreeView = renderSkillsTreeView;


// Export as object for wrapView compatibility
export default { render: renderSkillsTreeView };
