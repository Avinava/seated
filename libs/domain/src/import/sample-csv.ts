/**
 * A wedding-flavoured guest list to try the importer with. On purpose it has one
 * row without a name, one bad email, and two guests already in the sample
 * wedding: Dev Malhotra (same email, different case) and Kamla Mehta (same name,
 * extra spaces). "Cousins" is a new group; "The Qureshis" a new party.
 */
export const SAMPLE_CSV_NAME = 'late-rsvps.csv';

export const SAMPLE_CSV = [
  'Full name,E-mail,Household,Side,Attending,Menu,Allergies,Tags,Wheelchair,Notes',
  'Farah Qureshi,farah.qureshi@example.com,The Qureshis,Friends,yes,Vegetarian,,out-of-town,,Flying in from Hyderabad',
  'Imran Qureshi,imran.qureshi@example.com,The Qureshis,Friends,Y,Non-veg,,out-of-town,,',
  "Lakshmi Iyengar,lakshmi.iyengar@example.com,,Bride's family,attending,Jain,No onion or garlic,vip,yes,Needs the step-free entrance",
  'Tejas Bhosale,tejas.bhosale@example,,Work,maybe,veg,,,,',
  ',priyanka.n@example.com,,Friends,yes,vegan,,,,',
  'dev malhotra,DEV.MALHOTRA@EXAMPLE.COM,,Friends,yes,non vegetarian,,,,Sent his RSVP twice',
  'Kamla  Mehta,,The Mehtas,Bride\'s family,yes,veg,"Diabetic, less sugar",vip,wheelchair,',
  "Zoya Ansari,zoya.ansari@example.com,The Ansaris,Groom's family,no,,,,,",
  "Rehan Ansari,rehan.ansari@example.com,The Ansaris,Groom's family,declined,,,,,",
  'Maria Fernandes,maria.fernandes@example.com,,Work,yes,Non-Veg,Shellfish allergy,,,',
  'Joel D\'Souza,joel.dsouza@example.com,,Friends,tbc,veg,,"kids, out-of-town",,"Bringing his ""famous"" playlist"',
  'Aisha Lobo,aisha.lobo@example.com,,Cousins,yes,Vegan,,,,',
].join('\r\n');
