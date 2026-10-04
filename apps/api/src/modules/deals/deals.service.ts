import type { BudgetDestinationDto, CheapDealDto } from "@flysmart/contracts";
import { Injectable } from "@nestjs/common";

import { FlightProvider } from "../../infra/flight/flight.provider.js";

@Injectable()
export class DealsService {
  constructor(private readonly flightProvider: FlightProvider) {}

  async getDeals(): Promise<CheapDealDto[]> {
    return this.flightProvider.getCheapDeals();
  }

  async exploreBudget(origin: string, maxBudget: number): Promise<BudgetDestinationDto[]> {
    return this.flightProvider.getBudgetDestinations(origin, maxBudget);
  }
}
