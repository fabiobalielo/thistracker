import { TimeEntry } from "./types";

export class SheetsPartitioningService {
  /**
   * Get the appropriate sheet name for a time entry based on its date
   */
  static getTimeEntrySheetName(timeEntry: TimeEntry): string {
    const date = new Date(timeEntry.startTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    // Use underscore instead of hyphen to avoid potential parsing issues
    return `TimeEntries_${year}_${month}`;
  }

  /**
   * Get all possible sheet names for a date range
   */
  static getTimeEntrySheetNames(startDate: Date, endDate: Date): string[] {
    const sheets: string[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const year = current.getFullYear();
      const month = String(current.getMonth() + 1).padStart(2, "0");
      // Use underscore instead of hyphen to avoid potential parsing issues
      sheets.push(`TimeEntries_${year}_${month}`);

      // Move to next month
      current.setMonth(current.getMonth() + 1);
    }

    return sheets;
  }

  /**
   * Get sheet names for the last N months
   */
  static getRecentTimeEntrySheetNames(months: number = 6): string[] {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return this.getTimeEntrySheetNames(startDate, endDate);
  }

  /**
   * Check if a time entry should be archived (older than 1 year)
   */
  static shouldArchive(timeEntry: TimeEntry): boolean {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return new Date(timeEntry.startTime) < oneYearAgo;
  }

  /**
   * Get archive spreadsheet name for a year
   */
  static getArchiveSpreadsheetName(year: number): string {
    return `ThisTracker-Archive-${year}`;
  }

  /**
   * Get the current active sheet name for time entries
   */
  static getCurrentTimeEntrySheetName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    return `TimeEntries-${year}-${month}`;
  }

  /**
   * Parse sheet name to get year and month
   */
  static parseTimeEntrySheetName(
    sheetName: string
  ): { year: number; month: number } | null {
    const match = sheetName.match(/^TimeEntries-(\d{4})-(\d{2})$/);
    if (!match) return null;

    return {
      year: parseInt(match[1]),
      month: parseInt(match[2]),
    };
  }

  /**
   * Check if a sheet name is a time entry sheet
   */
  static isTimeEntrySheet(sheetName: string): boolean {
    return /^TimeEntries-\d{4}-\d{2}$/.test(sheetName);
  }

  /**
   * Get sheet names for pagination (recent first)
   */
  static getPaginatedTimeEntrySheetNames(
    page: number = 1,
    pageSize: number = 12
  ): string[] {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - page * pageSize);

    const allSheets = this.getTimeEntrySheetNames(startDate, endDate);

    // Return most recent sheets first
    return allSheets.slice(0, pageSize);
  }
}
