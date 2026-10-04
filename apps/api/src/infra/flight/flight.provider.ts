import type {
  BudgetDestinationDto,
  CheapDealDto,
  FareMatrixItemDto,
  FlightDto,
  FlightSearchQuery,
} from "@flysmart/contracts";

export abstract class FlightProvider {
  abstract searchFlights(query: FlightSearchQuery): Promise<FlightDto[]>;
  abstract getFlightById(id: string): Promise<FlightDto | null>;
  abstract getFareMatrix(
    origin: string,
    destination: string,
    startDate: string,
    days: number,
  ): Promise<FareMatrixItemDto[]>;
  abstract getCheapDeals(): Promise<CheapDealDto[]>;
  abstract getBudgetDestinations(
    origin: string,
    maxBudget: number,
  ): Promise<BudgetDestinationDto[]>;
}
