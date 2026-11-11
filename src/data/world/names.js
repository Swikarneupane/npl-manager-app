// Name pools for generated domestic players, by nation: { first: [...], last: [...] }. These are
// common given names and surnames, never a real player's full name on purpose. Nations not listed
// here fall back to the pools in src/game/data.js (OS_NAMES, NEP_NAMES).
export const NAME_POOLS = {
  // Ireland and Canada (domestic-rest): common Irish names; Canada's mix of English, Punjabi, Gujarati,
  // Tamil and Caribbean surnames, as in its domestic and club cricket.
  IRE: {
    first: ['Conor', 'Sean', 'Liam', 'Cian', 'Darragh', 'Eoin', 'Ciaran', 'Niall', 'Ronan', 'Padraig', 'Aidan', 'Declan', 'Fionn', 'Oisin', 'Rory', 'Shane', 'Killian', 'Colm', 'Gavin', 'Dylan', 'Ryan', 'Jack', 'Adam', 'Luke', 'Cathal', 'Diarmuid', 'Tadhg', 'Brendan'],
    last: ['Murphy', 'Kelly', 'Walsh', 'Byrne', 'Ryan', 'Doyle', 'Brennan', 'Lynch', 'Kavanagh', 'Quinn', 'Nolan', 'Fitzgerald', 'Hegarty', 'Gallagher', 'Moran', 'Kennedy', 'Duffy', 'Brady', 'Keane', 'Flanagan', 'Mulholland', 'Devlin', 'Hughes', 'Maguire', 'Connolly', 'Farrell', 'Gormley', 'McCann', 'McGrath', 'Donnelly'],
  },
  CAN: {
    first: ['Aman', 'Harjot', 'Gurveer', 'Dhruv', 'Nikhil', 'Arjun', 'Kevin', 'Ravi', 'Jason', 'Ryan', 'Sukhman', 'Parth', 'Kiran', 'Tyler', 'Andre', 'Dilan', 'Ishan', 'Matthew', 'Noah', 'Rohan', 'Sahil', 'Tharun', 'Varun', 'Owen', 'Daniel', 'Jaskaran'],
    last: ['Sandhu', 'Gill', 'Brar', 'Dhillon', 'Patel', 'Shah', 'Desai', 'Rajaratnam', 'Sivakumar', 'Thompson', 'Campbell', 'Richards', 'Baptiste', 'Grant', 'Mitchell', 'Fraser', 'MacLeod', 'Kaur', 'Bains', 'Sidhu', 'Mehta', 'Joshi', 'Nair', 'Ramdass', 'Persaud', 'Singh'],
  },
  // Asia (domestic-asia): common given names and surnames of each nation's domestic cricket. UAE and
  // Oman domestic cricket is played mostly by South Asian expatriates and nationals, hence the mix.
  IND: {
    first: ['Aakash', 'Abhishek', 'Aditya', 'Ajay', 'Akshay', 'Aman', 'Amit', 'Anand', 'Ankit', 'Arjun', 'Ashish', 'Deepak', 'Gaurav', 'Harsh', 'Karan', 'Kunal', 'Manish', 'Mayank', 'Mohit', 'Nikhil', 'Nitin', 'Pankaj', 'Pradeep', 'Prashant', 'Rahul', 'Rajat', 'Ravi', 'Rohan', 'Sachin', 'Sandeep', 'Saurabh', 'Shivam', 'Siddharth', 'Sumit', 'Tanmay', 'Varun', 'Vikas', 'Vivek', 'Yash', 'Sai', 'Pranav', 'Akhil', 'Vignesh', 'Arun', 'Suresh', 'Rakesh', 'Dhruv', 'Kartik'],
    last: ['Sharma', 'Verma', 'Gupta', 'Singh', 'Kumar', 'Yadav', 'Patel', 'Joshi', 'Mishra', 'Pandey', 'Tiwari', 'Chauhan', 'Rathore', 'Desai', 'Kulkarni', 'Patil', 'Jadhav', 'Pawar', 'Naik', 'Shetty', 'Rao', 'Reddy', 'Nair', 'Menon', 'Pillai', 'Iyer', 'Krishnan', 'Subramanian', 'Das', 'Ghosh', 'Banerjee', 'Mukherjee', 'Saha', 'Bhatt', 'Thakur', 'Negi', 'Rawat', 'Saini', 'Malik', 'Bhardwaj', 'Choudhary', 'Mehta', 'Shah', 'Kohli', 'Dubey', 'Sinha', 'Mohanty', 'Barua'],
  },
  PAK: {
    first: ['Abdullah', 'Ahmed', 'Ali', 'Asad', 'Bilal', 'Danish', 'Faisal', 'Faizan', 'Farhan', 'Hamza', 'Haris', 'Hassan', 'Husnain', 'Imran', 'Irfan', 'Kamran', 'Khurram', 'Mohsin', 'Mubasir', 'Muhammad', 'Mujtaba', 'Naveed', 'Nouman', 'Omair', 'Qasim', 'Rizwan', 'Rohail', 'Saad', 'Sajjad', 'Salman', 'Saqib', 'Sarmad', 'Shahzaib', 'Sufiyan', 'Taimoor', 'Umar', 'Usama', 'Waqas', 'Waleed', 'Zain', 'Zeeshan', 'Arsalan', 'Junaid', 'Adnan', 'Tayyab'],
    last: ['Khan', 'Ahmed', 'Ali', 'Butt', 'Malik', 'Iqbal', 'Hussain', 'Shah', 'Qureshi', 'Mirza', 'Akhtar', 'Anwar', 'Aslam', 'Bashir', 'Rafiq', 'Raza', 'Saleem', 'Siddiqui', 'Javed', 'Tariq', 'Mehmood', 'Nawaz', 'Rasheed', 'Yousaf', 'Hayat', 'Afridi', 'Khattak', 'Durrani', 'Gondal', 'Cheema', 'Bajwa', 'Ghauri', 'Jamil', 'Latif', 'Sabir', 'Shafiq', 'Zafar', 'Zaman', 'Arif', 'Ashraf', 'Baig', 'Abbasi'],
  },
  SL: {
    first: ['Kasun', 'Nuwan', 'Chamara', 'Dinesh', 'Lahiru', 'Sachith', 'Pasindu', 'Ravindu', 'Thilina', 'Isuru', 'Chathura', 'Janith', 'Tharindu', 'Sahan', 'Nimesh', 'Kavindu', 'Dilshan', 'Supun', 'Hasitha', 'Chanuka', 'Sandun', 'Lasith', 'Ashen', 'Malith', 'Nipun', 'Yasiru', 'Shehan', 'Oshada', 'Ravishka', 'Vimukthi', 'Dulaj', 'Heshan', 'Pulina', 'Sonal', 'Kamindu', 'Lakshan', 'Thisara', 'Ranesh', 'Manoj', 'Asitha'],
    last: ['Perera', 'Fernando', 'Silva', 'de Silva', 'Jayasuriya', 'Wickramasinghe', 'Gunawardena', 'Bandara', 'Dissanayake', 'Herath', 'Rathnayake', 'Senanayake', 'Wijesinghe', 'Karunaratne', 'Jayawardena', 'Ranasinghe', 'Kumara', 'Liyanage', 'Pathirana', 'Rajapaksha', 'Samarawickrama', 'Weerasinghe', 'Abeysekara', 'Amarasinghe', 'Ekanayake', 'Gamage', 'Hettiarachchi', 'Jayasinghe', 'Kulasekara', 'Madushanka', 'Munasinghe', 'Nanayakkara', 'Peiris', 'Ratnayake', 'Sandakan', 'Tennakoon', 'Udawatte', 'Vithanage', 'Wanigasekara', 'Mendis'],
  },
  BAN: {
    first: ['Abdul', 'Afif', 'Al-Amin', 'Anamul', 'Ariful', 'Ashiqur', 'Fazle', 'Habibur', 'Imrul', 'Jahid', 'Jakir', 'Kamrul', 'Mahmudul', 'Mahfuzur', 'Mehedi', 'Minhajul', 'Mizanur', 'Mohammad', 'Monir', 'Nazmul', 'Nasir', 'Parvez', 'Rafiqul', 'Rakibul', 'Rejaur', 'Rubel', 'Saif', 'Sajjadul', 'Salman', 'Shafiul', 'Shahadat', 'Shamim', 'Sohag', 'Sumon', 'Tanvir', 'Towhidul', 'Yasir', 'Ziaur', 'Mosharraf', 'Rony'],
    last: ['Hossain', 'Islam', 'Rahman', 'Hasan', 'Ahmed', 'Alam', 'Uddin', 'Haque', 'Mia', 'Sarkar', 'Chowdhury', 'Khan', 'Kabir', 'Karim', 'Mahmud', 'Mollah', 'Talukdar', 'Bhuiyan', 'Sheikh', 'Akand', 'Babu', 'Biswas', 'Das', 'Ali', 'Roy', 'Saha', 'Sultan', 'Haider', 'Joy', 'Emon', 'Shanto', 'Rana', 'Anik', 'Reza', 'Siddique', 'Mridha'],
  },
  AFG: {
    first: ['Abdul', 'Ahmad', 'Asadullah', 'Bahir', 'Farid', 'Ghulam', 'Hamid', 'Hashmatullah', 'Ihsanullah', 'Izharulhaq', 'Jamshid', 'Karim', 'Khalil', 'Mansoor', 'Mohammad', 'Mujeeb', 'Nangyal', 'Naveed', 'Nisar', 'Noor', 'Qais', 'Rahmat', 'Sami', 'Sediqullah', 'Shafiqullah', 'Shahidullah', 'Sharafuddin', 'Wafadar', 'Waheedullah', 'Yamin', 'Zahir', 'Zia', 'Bilal', 'Ijaz', 'Fazal', 'Haseebullah', 'Inayat', 'Javed', 'Shams', 'Ziaur'],
    last: ['Zadran', 'Stanikzai', 'Ahmadzai', 'Mangal', 'Shinwari', 'Safi', 'Kharoti', 'Momand', 'Wardak', 'Popalzai', 'Hotak', 'Taniwal', 'Sherzad', 'Ghorbandi', 'Khaksar', 'Durrani', 'Atal', 'Ibrahimkhil', 'Jabarkhil', 'Malikzai', 'Noorzai', 'Omarzai', 'Sahak', 'Sultani', 'Tarakhil', 'Yousafzai', 'Zazai', 'Alikhil', 'Amin', 'Habibi', 'Jamal', 'Karimi', 'Naseri', 'Rahimi', 'Sadat', 'Wali'],
  },
  UAE: {
    first: ['Mohammed', 'Ahmed', 'Ali', 'Hamdan', 'Rashid', 'Khalid', 'Saeed', 'Omar', 'Aryan', 'Vishnu', 'Rahul', 'Karthik', 'Nikhil', 'Aditya', 'Sanchit', 'Dhruv', 'Hassan', 'Zain', 'Bilal', 'Usman', 'Faizan', 'Junaid', 'Waqar', 'Haider', 'Imran', 'Asif', 'Sameer', 'Rohan', 'Tanish', 'Aman', 'Shahid', 'Irfan', 'Ayaan', 'Danish', 'Vrittya', 'Jash', 'Basil', 'Akif'],
    last: ['Khan', 'Ahmed', 'Al Hammadi', 'Al Mansoori', 'Al Shamsi', 'Al Nuaimi', 'Butt', 'Malik', 'Raza', 'Iqbal', 'Hussain', 'Siddiqui', 'Qureshi', 'Mirza', 'Shah', 'Nair', 'Menon', 'Pillai', 'Kumar', 'Sharma', 'Patel', 'Joshi', 'Rao', 'Iyer', 'Das', 'Gill', 'Sandhu', 'Thomas', 'George', 'Varghese', 'Ali', 'Anwar', 'Javed', 'Rafiq', 'Saleem', 'Tariq'],
  },
  OMA: {
    first: ['Mohammed', 'Ahmed', 'Ali', 'Said', 'Salim', 'Khalid', 'Hamood', 'Sultan', 'Nasser', 'Sufyan', 'Bilal', 'Zeeshan', 'Fayyaz', 'Kashyap', 'Jatinder', 'Ayaan', 'Karan', 'Vinayak', 'Sandeep', 'Pratik', 'Shoaib', 'Kaleem', 'Mujibur', 'Naseem', 'Hammad', 'Wasim', 'Aqeel', 'Ravi', 'Jay', 'Nikhil', 'Shakeel', 'Aamir', 'Hasan', 'Imran', 'Rizwan', 'Danish'],
    last: ['Al Balushi', 'Al Hinai', 'Al Busaidi', 'Al Harthi', 'Al Rawahi', 'Al Saadi', 'Khan', 'Ahmed', 'Butt', 'Malik', 'Iqbal', 'Hussain', 'Shah', 'Raza', 'Mehmood', 'Ilyas', 'Patel', 'Prajapati', 'Joshi', 'Mehta', 'Desai', 'Kumar', 'Singh', 'Nair', 'Pillai', 'Menon', 'Rao', 'Sharma', 'Ali', 'Akhtar', 'Anwar', 'Javed', 'Nadeem', 'Saleem'],
  },
};
