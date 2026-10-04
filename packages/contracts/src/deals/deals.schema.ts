import { z } from "zod";

export interface CheapDealDto {
  id: string;
  flightId: string;
  origin: string;
  originCode: string;
  destination: string;
  destinationCode: string;
  destinationImage: string;
  departureDate: string;
  airline: string;
  airlineLogo: string;
  regularPrice: number;
  dealPrice: number;
  discountPercent: number;
  badge: string;
  remainingSeats: number;
}

export const budgetExploreQuerySchema = z.object({
  origin: z.string().trim().min(2).max(10).default("THR"),
  maxBudget: z.coerce.number().min(1000000, "حداقل بودجه ۱,۰۰۰,۰۰۰ ریال است"),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "فرمت ماه باید YYYY-MM باشد")
    .optional(),
});

export type BudgetExploreQuery = z.infer<typeof budgetExploreQuerySchema>;

export interface BudgetDestinationDto {
  destination: string;
  destinationCode: string;
  destinationImage: string;
  description: string;
  minPrice: number;
  bestDate: string;
  airline: string;
  availableFlightsCount: number;
}
