import { useEffect, useRef, useState } from "react";
import * as PIXI from "pixi.js";
import Matter from "matter-js";

interface Ball {
  id: string;
  body: Matter.Body;
  graphics: PIXI.Graphics;
  color: number;
  playerId: string;
}

interface GameCanvasProps {
  onBallWin?: (ballId: string, playerId: string) => void;
  className?: string;
}

export const GameCanvas = ({ onBallWin, className }: GameCanvasProps) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [app, setApp] = useState<PIXI.Application | null>(null);
  const [engine, setEngine] = useState<Matter.Engine | null>(null);
  const ballsRef = useRef<Ball[]>([]);
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'finished'>('waiting');

  // Initialize PIXI and Matter.js
  useEffect(() => {
    if (!canvasRef.current) return;

    const initGame = async () => {
      // Create PIXI Application
      const pixiApp = new PIXI.Application();
      await pixiApp.init({
        width: 360,
        height: 640,
        backgroundColor: 0x1a1a2e,
        antialias: true,
      });

      canvasRef.current!.appendChild(pixiApp.canvas);

      // Create Matter.js engine
      const matterEngine = Matter.Engine.create();
      matterEngine.world.gravity.y = 0.8;

      // Create boundaries
      const ground = Matter.Bodies.rectangle(180, 630, 360, 20, { 
        isStatic: true,
        render: { fillStyle: '#16213e' }
      });
      const leftWall = Matter.Bodies.rectangle(10, 320, 20, 640, { 
        isStatic: true,
        render: { fillStyle: '#16213e' }
      });
      const rightWall = Matter.Bodies.rectangle(350, 320, 20, 640, { 
        isStatic: true,
        render: { fillStyle: '#16213e' }
      });

      // Create pegs/obstacles
      const pegs = [];
      for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 6; col++) {
          const x = 80 + col * 40 + (row % 2) * 20;
          const y = 150 + row * 50;
          const peg = Matter.Bodies.circle(x, y, 8, {
            isStatic: true,
            restitution: 0.8,
            render: { fillStyle: '#0f3460' }
          });
          pegs.push(peg);

          // Draw peg in PIXI
          const pegGraphics = new PIXI.Graphics();
          pegGraphics.circle(x, y, 8);
          pegGraphics.fill(0x0f3460);
          pegGraphics.stroke({ width: 2, color: 0x16213e });
          pixiApp.stage.addChild(pegGraphics);
        }
      }

      // Create winning slots
      const slots = [];
      const slotPositions = [60, 120, 180, 240, 300];
      slotPositions.forEach((x, index) => {
        const slot = Matter.Bodies.rectangle(x, 580, 50, 40, {
          isStatic: true,
          isSensor: true,
          render: { fillStyle: '#4ecdc4' }
        });
        slots.push(slot);

        // Draw slot in PIXI
        const slotGraphics = new PIXI.Graphics();
        slotGraphics.roundRect(x - 25, 560, 50, 40, 10);
        slotGraphics.fill(0x4ecdc4);
        slotGraphics.stroke({ width: 2, color: 0x26d0ce });
        pixiApp.stage.addChild(slotGraphics);

        // Add slot number
        const text = new PIXI.Text({
          text: `${index + 1}`,
          style: {
            fontSize: 16,
            fill: 0x1a1a2e,
            fontWeight: 'bold'
          }
        });
        text.anchor.set(0.5);
        text.position.set(x, 580);
        pixiApp.stage.addChild(text);
      });

      // Add all bodies to world
      Matter.World.add(matterEngine.world, [ground, leftWall, rightWall, ...pegs, ...slots]);

      // Setup collision detection
      Matter.Events.on(matterEngine, 'collisionStart', (event) => {
        event.pairs.forEach((pair) => {
          const { bodyA, bodyB } = pair;
          
          // Check if ball hits winning slot
          slots.forEach((slot, index) => {
            if ((bodyA === slot || bodyB === slot)) {
              const ball = ballsRef.current.find(b => b.body === bodyA || b.body === bodyB);
              if (ball && onBallWin) {
                onBallWin(ball.id, ball.playerId);
                setGameState('finished');
              }
            }
          });
        });
      });

      // Animation loop
      const gameLoop = () => {
        Matter.Engine.update(matterEngine);
        
        // Update ball graphics positions
        ballsRef.current.forEach(ball => {
          ball.graphics.position.set(ball.body.position.x, ball.body.position.y);
          ball.graphics.rotation = ball.body.angle;
        });
      };

      pixiApp.ticker.add(gameLoop);

      setApp(pixiApp);
      setEngine(matterEngine);
    };

    initGame();

    return () => {
      if (app) {
        app.destroy(true);
      }
    };
  }, []);

  const dropBall = (playerId: string = 'player1') => {
    if (!app || !engine) return;

    const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b];
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    // Create ball body
    const x = 180 + (Math.random() - 0.5) * 60; // Random position near center
    const ball = Matter.Bodies.circle(x, 50, 12, {
      restitution: 0.6,
      friction: 0.001,
      frictionAir: 0.01,
      density: 0.001
    });

    // Create ball graphics
    const ballGraphics = new PIXI.Graphics();
    ballGraphics.circle(0, 0, 12);
    ballGraphics.fill(color);
    ballGraphics.stroke({ width: 2, color: 0xffffff });
    
    // Add simple glow effect with stroke
    ballGraphics.stroke({ width: 3, color: 0xffffff, alpha: 0.8 });

    app.stage.addChild(ballGraphics);

    const ballObj: Ball = {
      id: `ball_${Date.now()}_${Math.random()}`,
      body: ball,
      graphics: ballGraphics,
      color,
      playerId
    };

    ballsRef.current.push(ballObj);
    Matter.World.add(engine.world, ball);

    setGameState('playing');

    // Remove ball after some time if it gets stuck
    setTimeout(() => {
      const index = ballsRef.current.findIndex(b => b.id === ballObj.id);
      if (index !== -1) {
        Matter.World.remove(engine.world, ballObj.body);
        app.stage.removeChild(ballObj.graphics);
        ballsRef.current.splice(index, 1);
      }
    }, 15000);
  };

  const resetGame = () => {
    if (!app || !engine) return;

    ballsRef.current.forEach(ball => {
      Matter.World.remove(engine.world, ball.body);
      app.stage.removeChild(ball.graphics);
    });
    ballsRef.current.length = 0;
    setGameState('waiting');
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={canvasRef} className="rounded-xl overflow-hidden shadow-glow" />
      
      {/* Game Controls */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-3">
        <button
          onClick={() => dropBall()}
          className="btn-gaming"
          disabled={gameState === 'finished'}
        >
          Бросить шарик
        </button>
        
        {gameState === 'finished' && (
          <button
            onClick={resetGame}
            className="btn-gaming-secondary"
          >
            Новая игра
          </button>
        )}
      </div>

      {/* Game Status */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
        <div className="card-gaming px-4 py-2">
          <p className="text-center font-bold">
            {gameState === 'waiting' && 'Готов к игре'}
            {gameState === 'playing' && 'Игра идёт...'}
            {gameState === 'finished' && 'Игра завершена!'}
          </p>
        </div>
      </div>
    </div>
  );
};