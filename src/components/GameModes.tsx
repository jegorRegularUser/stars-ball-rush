import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, Crown, Clock } from "lucide-react";

interface GameMode {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  minBet: number;
  maxBet: number;
  multiplier?: string;
  isActive: boolean;
  players?: number;
}

interface GameModesProps {
  selectedMode: string;
  onModeSelect: (modeId: string) => void;
}

export const GameModes = ({ selectedMode, onModeSelect }: GameModesProps) => {
  const gameModes: GameMode[] = [
    {
      id: 'pvp',
      name: 'PvP Битва',
      description: 'Соревнуйтесь с другими игроками за общий призовой фонд',
      icon: <Crown className="w-5 h-5" />,
      minBet: 1,
      maxBet: 100,
      isActive: true,
      players: 23
    },
    {
      id: 'solo',
      name: 'Соло режим',
      description: 'Играйте против системы с фиксированными коэффициентами',
      icon: <Target className="w-5 h-5" />,
      minBet: 1,
      maxBet: 50,
      multiplier: 'x2.5',
      isActive: true
    },
    {
      id: 'blitz',
      name: 'Блиц игра',
      description: 'Быстрые раунды каждые 10 секунд',
      icon: <Zap className="w-5 h-5" />,
      minBet: 1,
      maxBet: 25,
      isActive: false,
      players: 0
    },
    {
      id: 'tournament',
      name: 'Турнир',
      description: 'Еженедельные турниры с крупными призами',
      icon: <Clock className="w-5 h-5" />,
      minBet: 10,
      maxBet: 500,
      isActive: false,
      players: 156
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-lg mb-4">Режимы игры</h3>
      
      {gameModes.map((mode) => (
        <Card 
          key={mode.id}
          className={`card-gaming p-4 cursor-pointer transition-all duration-gaming ${
            selectedMode === mode.id 
              ? 'ring-2 ring-primary shadow-glow' 
              : 'hover:shadow-glow-secondary'
          } ${
            !mode.isActive 
              ? 'opacity-50 cursor-not-allowed' 
              : ''
          }`}
          onClick={() => mode.isActive && onModeSelect(mode.id)}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className={`p-2 rounded-lg ${
                selectedMode === mode.id 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {mode.icon}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold">{mode.name}</h4>
                  {!mode.isActive && (
                    <Badge variant="outline" className="text-xs">
                      Скоро
                    </Badge>
                  )}
                  {mode.players !== undefined && mode.isActive && (
                    <Badge variant="secondary" className="text-xs bg-gradient-secondary">
                      {mode.players} игроков
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-2">
                  {mode.description}
                </p>
                
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Ставка: {mode.minBet}-{mode.maxBet} ⭐</span>
                  {mode.multiplier && (
                    <span className="text-accent font-bold">
                      Множитель: {mode.multiplier}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {selectedMode === mode.id && mode.isActive && (
              <div className="ml-2">
                <div className="w-3 h-3 bg-primary rounded-full animate-glow-pulse" />
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
};