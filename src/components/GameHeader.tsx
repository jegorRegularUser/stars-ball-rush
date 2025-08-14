import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings, Gift, Users, Info } from "lucide-react";

interface GameHeaderProps {
  playerName?: string;
  isOnline?: boolean;
  onlineCount?: number;
}

export const GameHeader = ({ playerName = "Игрок", isOnline = true, onlineCount = 1247 }: GameHeaderProps) => {
  return (
    <header className="flex items-center justify-between p-4 bg-gradient-gaming border-b border-border">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center font-bold text-primary-foreground">
            {playerName.charAt(0).toUpperCase()}
          </div>
          {isOnline && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse" />
          )}
        </div>
        
        <div>
          <h2 className="font-bold text-foreground">{playerName}</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Users className="w-3 h-3 mr-1" />
              {onlineCount.toLocaleString()} онлайн
            </Badge>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="gaming-ghost" size="icon">
          <Gift className="w-4 h-4" />
        </Button>
        
        <Button variant="gaming-ghost" size="icon">
          <Info className="w-4 h-4" />
        </Button>
        
        <Button variant="gaming-ghost" size="icon">
          <Settings className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
};