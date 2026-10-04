import type { FareMatrixItemDto, FlightDto, FlightSearchQuery } from "@flysmart/contracts";
import { Injectable, NotFoundException } from "@nestjs/common";

import { FlightProvider } from "../../infra/flight/flight.provider.js";

@Injectable()
export class FlightsService {
  constructor(private readonly flightProvider: FlightProvider) {}

  async search(query: FlightSearchQuery): Promise<FlightDto[]> {
    return this.flightProvider.searchFlights(query);
  }

  async getById(id: string): Promise<FlightDto> {
    const flight = await this.flightProvider.getFlightById(id);
    if (!flight) {
      throw new NotFoundException("پرواز مورد نظر یافت نشد");
    }
    return flight;
  }

  async getFareMatrix(
    origin: string,
    destination: string,
    startDate: string,
    days: number,
  ): Promise<FareMatrixItemDto[]> {
    return this.flightProvider.getFareMatrix(origin, destination, startDate, days);
  }
}
