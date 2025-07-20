import { renderHeader } from '../components/header.js';

export async function renderHomeView() {
  const main = document.getElementById('app');
  main.innerHTML = renderHeader() + `
    <div class="card">
        
    </div>
  `;
} 