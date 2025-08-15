import { useState, useEffect } from "react";
import { GameCanvas } from "@/components/GameCanvas";
import { GameHeader } from "@/components/GameHeader";
import { GameStats } from "@/components/GameStats";
import { GameModes } from "@/components/GameModes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Play, Trophy } from "lucide-react";
import { toast } from "sonner";

const Index = () => {
  const [selectedMode, setSelectedMode] = useState('pvp');
  const [balance, setBalance] = useState(150);
  const [betAmount, setBetAmount] = useState(5);
  const [currentRound, setCurrentRound] = useState({
    timeLeft: 25,
    playersCount: 23,
    prizePool: 115
  });
  const [gameStats] = useState({
    gamesPlayed: 47,
    gamesWon: 23
  });

  // Countdown timer for rounds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentRound(prev => ({
        ...prev,
        timeLeft: prev.timeLeft > 0 ? prev.timeLeft - 1 : 30
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleBallWin = (ballId: string, playerId: string) => {
    const winAmount = selectedMode === 'pvp' ? currentRound.prizePool : betAmount * 2.5;
    setBalance(prev => prev + winAmount);
    toast.success(`Поздравляем! Вы выиграли ${winAmount} ⭐`);
  };

  const handlePlaceBet = () => {
    if (balance < betAmount) {
      toast.error("Недостаточно средств");
      return;
    }
    
    setBalance(prev => prev - betAmount);
    setCurrentRound(prev => ({
      ...prev,
      prizePool: prev.prizePool + betAmount,
      playersCount: prev.playersCount + 1
    }));
    
    toast.success(`Ставка ${betAmount} ⭐ принята!`);
  };

  return (
    <div className="min-h-screen bg-gradient-gaming">
      {/* Header */}
      <GameHeader playerName="Алексей" />

      {/* Main Game Area */}
      <div className="container mx-auto p-4 space-y-4">
        <Tabs defaultValue="game" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-card">
            <TabsTrigger value="game" className="data-[state=active]:bg-gradient-primary">
              <Play className="w-4 h-4 mr-2" />
              Игра
            </TabsTrigger>
            <TabsTrigger value="modes" className="data-[state=active]:bg-gradient-secondary">
              <Trophy className="w-4 h-4 mr-2" />
              Режимы
            </TabsTrigger>

            <TabsTrigger value="stats" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-accent data-[state=active]:to-primary">
              <Star className="w-4 h-4 mr-2" />
              Статистика
            </TabsTrigger>
          </TabsList>

          <TabsContent value="game" className="space-y-4">
            {/* Game Canvas */}
            <div className="relative">
              <GameCanvas 
                onBallWin={handleBallWin}
                className="w-full max-w-sm mx-auto"
              />
            </div>

            {/* Betting Interface */}
            <Card className="card-gaming p-4">
              <h3 className="font-bold mb-4 text-center">Сделать ставку</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Режим:</span>
                  <Badge variant="secondary" className="bg-gradient-secondary">
                    {selectedMode === 'pvp' ? 'PvP Битва' : 'Соло режим'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Ставка:</span>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="gaming-outline" 
                      size="sm"
                      onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
                    >
                      -
                    </Button>
                    <span className="font-bold min-w-[3rem] text-center">{betAmount} ⭐</span>
                    <Button 
                      variant="gaming-outline" 
                      size="sm"
                      onClick={() => setBetAmount(Math.min(100, betAmount + 1))}
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Потенциальный выигрыш:</span>
                  <span className="font-bold text-accent">
                    {selectedMode === 'pvp' ? `${currentRound.prizePool + betAmount} ⭐` : `${(betAmount * 2.5).toFixed(1)} ⭐`}
                  </span>
                </div>

                <Button 
                  variant="gaming" 
                  size="lg" 
                  className="w-full"
                  onClick={handlePlaceBet}
                  disabled={balance < betAmount}
                >
                  Купить шарик за {betAmount} ⭐
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="modes">
            <GameModes 
              selectedMode={selectedMode}
              onModeSelect={setSelectedMode}
            />
          </TabsContent>

          <TabsContent value="stats">
            <GameStats 
              balance={balance}
              gamesPlayed={gameStats.gamesPlayed}
              gamesWon={gameStats.gamesWon}
              currentRound={currentRound}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
