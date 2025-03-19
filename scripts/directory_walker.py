import os
from pathlib import Path
import subprocess

def traverse_checked_data(checked_data_path, ref_dir_path):
    try:
        # Convert to absolute path
        directory = Path(checked_data_path).resolve()
        ref_dir = Path(ref_dir_path).resolve()
        
        # Check if directory exists
        if not directory.is_dir() or not ref_dir.is_dir():
            print(f"Error: not a valid directory")
            return

        print(f"\nchecked data path: {directory}\n")
        print(f"\nreference data path: {ref_dir}\n")
        
        diff_count = 0
        total_count = 0
        # List all items in the directory (non-recursively)
        for item in os.listdir(directory):
            item_path = directory / item
            if (item.endswith("-finished")):
                total_count += 1
                json_name = item.replace("-finished", "")
                checked_json_path = directory / item / json_name
                ref_json_path = ref_dir / json_name / json_name
                # Run system diff command
                try:
                    result = subprocess.run(
                        ['json-diff', str(ref_json_path), str(checked_json_path)],
                        capture_output=True,
                        text=True
                    )
                    
                    if result.stdout:
                        diff_count += 1
                        print(f"\nDifferences found in {json_name}:")
                        print(result.stdout)
                    else:
                        print(f"\nNo differences found in {json_name}")
                        
                except subprocess.CalledProcessError as e:
                    print(f"Error comparing files: {e}")
        print(f"\n {diff_count} out of {total_count} files are different")

    except Exception as e:
        print(f"Error occurred: {e}")

ref_dir = "/Users/foobar2077/Downloads/data_2_old"
checked_dir = "/Users/foobar2077/Downloads/data_2"
traverse_checked_data(checked_dir, ref_dir)