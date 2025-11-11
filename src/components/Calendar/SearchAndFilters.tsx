import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SearchAndFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedColors: string[];
  onColorToggle: (color: string) => void;
  dateRange: { start: string; end: string };
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onClearFilters: () => void;
  availableColors: Array<{ name: string; value: string }>;
}

export const SearchAndFilters = ({
  searchQuery,
  onSearchChange,
  selectedColors,
  onColorToggle,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  availableColors,
}: SearchAndFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const activeFiltersCount = selectedColors.length + (dateRange.start || dateRange.end ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar eventos por título ou descrição..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters Button */}
      <div className="flex items-center gap-2">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex-1 relative">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                >
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[80vh]">
            <SheetHeader>
              <SheetTitle>Filtros de Eventos</SheetTitle>
              <SheetDescription>
                Refine sua busca por cor e período
              </SheetDescription>
            </SheetHeader>
            
            <div className="space-y-6 mt-6">
              {/* Color Filters */}
              <div className="space-y-3">
                <Label>Filtrar por Categoria/Cor</Label>
                <div className="grid grid-cols-2 gap-2">
                  {availableColors.map((colorOption) => {
                    const isSelected = selectedColors.includes(colorOption.value);
                    return (
                      <button
                        key={colorOption.value}
                        onClick={() => onColorToggle(colorOption.value)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                          isSelected 
                            ? "border-primary bg-primary/10" 
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <div
                          className="w-6 h-6 rounded-full flex-shrink-0"
                          style={{ backgroundColor: colorOption.value }}
                        />
                        <span className="text-sm font-medium truncate">
                          {colorOption.name}
                        </span>
                        {isSelected && (
                          <Badge variant="secondary" className="ml-auto">✓</Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-3">
                <Label>Filtrar por Período</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="date-start" className="text-xs text-muted-foreground">
                      Data Início
                    </Label>
                    <Input
                      id="date-start"
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => 
                        onDateRangeChange({ ...dateRange, start: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="date-end" className="text-xs text-muted-foreground">
                      Data Fim
                    </Label>
                    <Input
                      id="date-end"
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => 
                        onDateRangeChange({ ...dateRange, end: e.target.value })
                      }
                      min={dateRange.start}
                    />
                  </div>
                </div>
              </div>

              {/* Active Filters Summary */}
              {activeFiltersCount > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Filtros Ativos</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedColors.map((color) => {
                      const colorOption = availableColors.find(c => c.value === color);
                      return (
                        <Badge 
                          key={color} 
                          variant="secondary" 
                          className="flex items-center gap-2"
                        >
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {colorOption?.name}
                          <button
                            onClick={() => onColorToggle(color)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {(dateRange.start || dateRange.end) && (
                      <Badge variant="secondary" className="flex items-center gap-2">
                        📅 Período personalizado
                        <button
                          onClick={() => onDateRangeChange({ start: "", end: "" })}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={onClearFilters}
                  className="flex-1"
                  disabled={activeFiltersCount === 0}
                >
                  Limpar Tudo
                </Button>
                <Button
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Aplicar Filtros
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClearFilters}
            title="Limpar filtros"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Filtrando por:</span>
          {selectedColors.map((color) => {
            const colorOption = availableColors.find(c => c.value === color);
            return (
              <Badge 
                key={color} 
                variant="secondary" 
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs">{colorOption?.name}</span>
              </Badge>
            );
          })}
          {(dateRange.start || dateRange.end) && (
            <Badge variant="secondary">
              <span className="text-xs">
                {dateRange.start && dateRange.end 
                  ? `${new Date(dateRange.start).toLocaleDateString('pt-BR')} - ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`
                  : dateRange.start 
                  ? `A partir de ${new Date(dateRange.start).toLocaleDateString('pt-BR')}`
                  : `Até ${new Date(dateRange.end).toLocaleDateString('pt-BR')}`
                }
              </span>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
