export type WeeklyMenuDay = {
  day: string;
  breakfast: string;
  lunch: string;
  snacks: string;
  dinner: string;
};

// Transcribed from the supplied "MESS MENU W26 AUG-SEPT" document. It is a
// reference schedule only; live dated meals published by an admin take priority.
export const w26MessMenu: WeeklyMenuDay[] = [
  { day: "Monday", breakfast: "Uttappam, sambar, chutney, banana, bread, butter, jam, boiled egg", lunch: "Rice, dal fry (chana), pindi chhole, sambar, cucumber, beetroot, ragi roti, lemon, pickle", snacks: "Fried idli, tea", dinner: "Rice, dal tadka (tur), bhindi masala, amti, roti, sprouts, lemon, pickle" },
  { day: "Tuesday", breakfast: "Paratha, chana masala, curd, banana, bread, butter, jam, boiled egg", lunch: "Rice, dal makhani, aloo parwal, sambar, cucumber, beetroot, ragi roti, lemon, pickle, chutney, boondi raita", snacks: "Samosa, tea", dinner: "Onion pepper rice, rajma dal, soya bean masala, rasam, roti, salad, lemon, pickle" },
  { day: "Wednesday", breakfast: "Rava veggie upma, coconut chutney, banana, bread, butter, jam, boiled egg", lunch: "Rice, kadhi pakoda, aloo matar gravy, sambar, cucumber, beetroot, roti, pickle chutney, curd", snacks: "Pani puri (5 pieces), coffee", dinner: "Jeera rice, green moong dal, matar paneer / chicken kadai, rasam, bajra roti, pickle, fryums" },
  { day: "Thursday", breakfast: "Medu wada, sambar, chutney, banana, bread, butter, jam, boiled egg", lunch: "Rice, dal maharaja, egg mix, sambar, salad, millet roti, lemon, pickle, tomato chutney, curd", snacks: "Sweet corn masala, coffee", dinner: "Lemon rice, palak dal (tur), chhole masala, puri / bhatura, rasam, salad, onion, tomato, lemon, pickle" },
  { day: "Friday", breakfast: "Masala dosa, sambar, chutney, banana, bread, butter, jam, boiled egg", lunch: "Rice, dal maharani, kundru aloo, sambar, cucumber, beetroot, roti, lemon, pickle, tomato chutney, curd", snacks: "Papdi chaat, tea", dinner: "Peas pulao, masoor dal, kadai paneer / egg curry, rasam, roti, onion, lemon, fruit custard / moong dal halwa, pickle" },
  { day: "Saturday", breakfast: "Aloo paratha, curd, chutney, banana, bread, butter, jam, boiled egg", lunch: "Rice, dal panchratna, sev bhaji, sambar, cucumber, beetroot, bajra roti, lemon, pickle chutney, chutney, curd", snacks: "Dahi wada, tea", dinner: "Masala rice, dal amritsari, dum aloo, rasam, ragi roti, tomato, lemon pickle" },
  { day: "Sunday", breakfast: "Poha, chana curry, banana, bread, butter, jam, boiled egg", lunch: "Rice, urad dal, chicken kolhapuri / paneer kolhapuri, onion, lemon, pickle, buttermilk", snacks: "Packet item, coffee", dinner: "Dal bhat with aloo bhujia / masala khichdi, dahi, papad, roti, cucumber, beetroot, lemon, pickle, ice cream" },
];

export const mealMeta = {
  breakfast: { label: "Breakfast", time: "7:30–9:00 AM" },
  lunch: { label: "Lunch", time: "12:00–2:00 PM" },
  snacks: { label: "Snacks", time: "5:30–6:30 PM" },
  dinner: { label: "Dinner", time: "7:30–9:30 PM" },
} as const;
