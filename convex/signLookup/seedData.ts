export type DictionarySeedEntry = {
  signId: string;
  name: string;
  category: string;
  description: string;
};

export const CORE_DICTIONARY_SEED: DictionarySeedEntry[] = [
  { signId: "more", name: "More", category: "Food & Drink", description: "Fingertips of both hands touch repeatedly" },
  { signId: "all-done", name: "All Done", category: "Food & Drink", description: "Both hands open and twist out" },
  { signId: "eat", name: "Eat", category: "Food & Drink", description: "Bring fingertips to mouth" },
  { signId: "drink", name: "Drink", category: "Food & Drink", description: "C hand tips toward mouth" },
  { signId: "milk", name: "Milk", category: "Food & Drink", description: "Open and close fist like milking" },
  { signId: "water", name: "Water", category: "Food & Drink", description: "W hand taps chin" },
  { signId: "help", name: "Help", category: "Actions", description: "Fist on palm lifts upward" },
  { signId: "please", name: "Please", category: "Greetings", description: "Flat hand circles on chest" },
  { signId: "thank-you", name: "Thank You", category: "Greetings", description: "Hand moves from chin forward" },
  { signId: "sorry", name: "Sorry", category: "Greetings", description: "Fist circles on chest" },
  { signId: "mom", name: "Mom", category: "Family", description: "Thumb taps chin" },
  { signId: "dad", name: "Dad", category: "Family", description: "Thumb taps forehead" },
  { signId: "baby", name: "Baby", category: "Family", description: "Arms cradle and rock" },
  { signId: "love", name: "Love", category: "Family", description: "Cross arms over chest" },
  { signId: "dog", name: "Dog", category: "Animals", description: "Pat leg and snap" },
  { signId: "cat", name: "Cat", category: "Animals", description: "Pull whiskers from cheeks" },
  { signId: "bird", name: "Bird", category: "Animals", description: "Pinch opens at mouth" },
  { signId: "happy", name: "Happy", category: "Emotions", description: "Brush chest upward" },
  { signId: "sad", name: "Sad", category: "Emotions", description: "Hands trace down face" },
  { signId: "hurt", name: "Hurt", category: "Emotions", description: "Index fingers twist together" },
  { signId: "yes", name: "Yes", category: "Questions", description: "Fist nods like a head" },
  { signId: "no", name: "No", category: "Questions", description: "Index and middle finger tap thumb" },
  { signId: "what", name: "What", category: "Questions", description: "Palms up and shake" },
  { signId: "where", name: "Where", category: "Questions", description: "Index finger wags side to side" },
  { signId: "who", name: "Who", category: "Questions", description: "Thumb circles near mouth" },
  { signId: "why", name: "Why", category: "Questions", description: "Middle finger from forehead to Y" },
  { signId: "play", name: "Play", category: "Actions", description: "Y hands shake" },
  { signId: "stop", name: "Stop", category: "Actions", description: "Chop hand onto palm" },
  { signId: "go", name: "Go", category: "Actions", description: "Index fingers move forward" },
  { signId: "sleep", name: "Sleep", category: "Time", description: "Hand closes as it drops to face" },
  { signId: "today", name: "Today", category: "Time", description: "Y hands drop together" },
  { signId: "tomorrow", name: "Tomorrow", category: "Time", description: "Thumb on cheek moves forward" },
  { signId: "red", name: "Red", category: "Colors", description: "Index finger brushes lips" },
  { signId: "blue", name: "Blue", category: "Colors", description: "B hand shakes" },
  { signId: "green", name: "Green", category: "Colors", description: "G hand shakes" },
  { signId: "yellow", name: "Yellow", category: "Colors", description: "Y hand shakes" },
  { signId: "one", name: "One", category: "Numbers", description: "Raise index finger" },
  { signId: "two", name: "Two", category: "Numbers", description: "Raise index and middle fingers" },
  { signId: "three", name: "Three", category: "Numbers", description: "Raise thumb, index, middle fingers" },
  { signId: "book", name: "Book", category: "Actions", description: "Hands open like a book" },
];
