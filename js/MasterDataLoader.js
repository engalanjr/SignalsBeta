
// MasterDataLoader - Loads data from the master CSV file
class MasterDataLoader {
    static async loadMasterCSV() {
        try {
            console.log('Loading master CSV data...');
            
            // Fetch the master CSV file with cache-busting
            const cacheBuster = `?v=${Date.now()}`;
            const response = await fetch(`./data.csv${cacheBuster}`);
            
            if (!response.ok) {
                throw new Error(`Failed to load CSV: ${response.status}`);
            }
            
            const csvText = await response.text();
            console.log('Master CSV loaded successfully, length:', csvText.length);
            console.log('First few lines of CSV:', csvText.substring(0, 500));
            
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
