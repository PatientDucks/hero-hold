import './style.css';
import { startGame } from './game.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <h1 class="game-title">Hero Hold</h1>
  <div class="game-layout"></div>
`;

const layout = app.querySelector<HTMLDivElement>('.game-layout')!;
startGame(layout);
