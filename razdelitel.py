with open('credentials.txt', 'r') as file:
    summer = len(file.readlines())


if summer != 0:
    with open('gener.txt', 'r') as gener_file:
        lines = gener_file.readlines()

       
        chunk_size = len(lines) // summer
        for i in range(summer):
            start = i * chunk_size
            end = (i + 1) * chunk_size
            chunk = lines[start:end]

           
            with open(f'Generated/part_{i + 1}.txt', 'w') as part_file:
                part_file.writelines(chunk)
else:
    print("Файл credentials.txt пуст. Невозможно выполнить деление.")