
// MasterDataLoader - Loads data from the master CSV file
class MasterDataLoader {
    static async loadMasterCSV() {
        try {
            console.log('Loading master CSV data...');
            
            // Fetch the master CSV file
            const response = await fetch('./data.csv');
            
            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.status}`);
            }
            
            const csvText = await response.text();
            console.log('Master CSV loaded successfully');
            
            // Parse the CSV using DataService methods
            const parsedData = DataService.parseCSV(csvText);
            console.log(`Parsed ${parsedData.length} records from master CSV`);
            
            return parsedData;
        } catch (error) {
            console.error('Error loading master CSV:', error);
            // Fall back to sample data if CSV loading fails
            return DataService.getSampleData();
        }
    }
}
