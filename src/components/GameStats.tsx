import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Star, Users, Timer } from "lucide-react";

interface GameStatsProps {
  balance: number;
  gamesPlayed: number;
  gamesWon: number;
  currentRound?: {
    timeLeft: number;
    playersCount: number;
    prizePool: number;
  };
}

export const GameStats = ({ balance, gamesPlayed, gamesWon, currentRound }: GameStatsProps) => {
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Player Stats */}
      <Card className="card-gaming p-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm text-muted-foreground">Баланс</p>
              <p className="text-lg font-bold text-accent">{balance} ⭐</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-secondary" />
            <div>
              <p className="text-sm text-muted-foreground">Побед</p>
              <p className="text-lg font-bold text-secondary">{winRate}%</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-between text-sm text-muted-foreground">
          <span>Игр сыграно: {gamesPlayed}</span>
          <span>Игр выиграно: {gamesWon}</span>
        </div>
      </Card>

      {/* Current Round Info */}
      {currentRound && (
        <Card className="card-gaming p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold">Текущий раунд</h3>
            <Badge variant="secondary" className="bg-gradient-secondary">
              PvP
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <Timer className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Осталось</span>
              <span className="font-bold text-primary">{currentRound.timeLeft}с</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Users className="w-4 h-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Игроков</span>
              <span className="font-bold text-secondary">{currentRound.playersCount}</span>
            </div>

            <div className="flex flex-col items-center gap-1">
              <Star className="w-4 h-4 text-accent" />
              <span className="text-sm text-muted-foreground">Приз</span>
              <span className="font-bold text-accent">{currentRound.prizePool} ⭐</span>
            </div>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="gaming-outline" size="sm">
          Пополнить
        </Button>
        <Button variant="gaming-ghost" size="sm">
          История
        </Button>
      </div>
    </div>
  );
};