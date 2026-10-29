import type { Meal } from '../model/types';
import type { Rng } from './random';

/** Common given names. Combined at random with surnames; none refer to real people. */
export const FEMALE = [
  'Aarti',
  'Anjali',
  'Asha',
  'Bhavna',
  'Charu',
  'Deepa',
  'Divya',
  'Esha',
  'Gauri',
  'Isha',
  'Jaya',
  'Kavya',
  'Komal',
  'Lata',
  'Madhu',
  'Meena',
  'Megha',
  'Nandini',
  'Neha',
  'Nisha',
  'Pallavi',
  'Pooja',
  'Priya',
  'Radha',
  'Rashmi',
  'Ritu',
  'Sangeeta',
  'Shalini',
  'Shreya',
  'Sneha',
  'Sunita',
  'Swati',
  'Tanvi',
  'Trisha',
  'Uma',
  'Vandana',
] as const;

export const MALE = [
  'Aakash',
  'Ajay',
  'Alok',
  'Amit',
  'Anil',
  'Arjun',
  'Ashok',
  'Bharat',
  'Chetan',
  'Deepak',
  'Dinesh',
  'Gaurav',
  'Girish',
  'Harish',
  'Hemant',
  'Karan',
  'Kunal',
  'Manish',
  'Mohan',
  'Mukesh',
  'Naveen',
  'Nikhil',
  'Pranav',
  'Prakash',
  'Rahul',
  'Rajesh',
  'Rakesh',
  'Ramesh',
  'Sameer',
  'Sanjay',
  'Siddharth',
  'Sunil',
  'Suresh',
  'Tarun',
  'Varun',
  'Vikram',
  'Vinod',
  'Vivek',
  'Yash',
  'Yogesh',
] as const;

export const CHILD = [
  'Aarav',
  'Vihaan',
  'Reyansh',
  'Advik',
  'Diya',
  'Myra',
  'Kiara',
  'Anaya',
  'Ira',
  'Saanvi',
  'Atharv',
  'Navya',
] as const;

export const SURNAMES = [
  'Agarwal',
  'Ahuja',
  'Arora',
  'Banerjee',
  'Bansal',
  'Bhatt',
  'Bose',
  'Chandra',
  'Chatterjee',
  'Chopra',
  'Das',
  'Desai',
  'Ghosh',
  'Gill',
  'Goel',
  'Gupta',
  'Jain',
  'Joshi',
  'Kaul',
  'Khurana',
  'Kulkarni',
  'Luthra',
  'Mathur',
  'Mishra',
  'Naidu',
  'Nair',
  'Natarajan',
  'Pandey',
  'Patel',
  'Pillai',
  'Puri',
  'Raman',
  'Rao',
  'Reddy',
  'Saxena',
  'Sethi',
  'Shetty',
  'Sinha',
  'Sood',
  'Srinivasan',
  'Tandon',
  'Thakur',
  'Trivedi',
  'Venkatesh',
  'Verma',
  'Wadhwa',
] as const;

/** Random combinations that happen to match well-known people; never generated. */
const AVOID = new Set([
  'Anil Agarwal',
  'Sanjay Gupta',
  'Gaurav Gupta',
  'Karan Patel',
  'Rahul Bose',
  'Amit Trivedi',
  'Vikram Chandra',
  'Pooja Bhatt',
  'Sunil Shetty',
  'Pallavi Joshi',
  'Varun Sood',
  'Deepak Chopra',
  'Priya Gill',
  'Arjun Mathur',
  'Nikhil Chopra',
  'Sneha Ullal',
  'Mohan Joshi',
  'Ashok Chopra',
  'Shalini Pandey',
  'Ajay Bhatt',
]);

export type Gender = 'f' | 'm' | 'child';

/** Hands out full names that are unique within one event. */
export class NameBook {
  private readonly used = new Set<string>();

  constructor(private readonly rng: Rng) {}

  reserve(full: string): string {
    this.used.add(full);
    return full;
  }

  /** A fresh given name for this surname. Falls back to a numbered name if the pool runs dry. */
  person(gender: Gender, surname: string): { first: string; full: string } {
    const pool = gender === 'f' ? FEMALE : gender === 'm' ? MALE : CHILD;
    for (let attempt = 0; attempt < 40; attempt++) {
      const first = this.rng.pick(pool);
      const full = `${first} ${surname}`;
      if (!this.used.has(full) && !AVOID.has(full)) return { first, full: this.reserve(full) };
    }
    for (const first of pool) {
      const full = `${first} ${surname}`;
      if (!this.used.has(full) && !AVOID.has(full)) return { first, full: this.reserve(full) };
    }
    const first = `${pool[0]} ${this.used.size}`;
    return { first, full: this.reserve(`${first} ${surname}`) };
  }
}

export function emailFor(full: string): string {
  return `${full.toLowerCase().replace(/[^a-z]+/g, '.')}@example.com`;
}

export const MEAL_WEIGHTS: Readonly<Record<Meal, number>> = { veg: 45, 'non-veg': 36, jain: 9, vegan: 7, other: 3 };

export const DIETARY_NOTES = ['No nuts', 'Gluten-free', 'Lactose intolerant', 'Diabetic, less sugar', 'No mushrooms'];

export const OTHER_DIETS = ['Keto', 'Eggetarian', 'Low salt'];
