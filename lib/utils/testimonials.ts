export interface Testimonial {
  quote: string;
  name: string;
  title: string;
  image: string;
}

export const testimonials: Testimonial[] = [
  {
    quote: "Our context was scattered across tools. Potpie brought everything together, sped up debugging and development, and helped our team ship faster.",
    name: "Rakesh Yadav",
    title: "Founder & CEO / FloBiz",
    image: "/images/Rakesh.jpeg"
  },
  {
    quote: "Potpie feels like adding two senior engineers to every team. Our workflows improved overnight, and reviews are way more consistent.",
    name: "Sudarshan Rampuria",
    title: "Senior Software Engineer / Astronomer",
    image: "/images/sudarshan.jpeg"
  },
  {
    quote: "Potpie is clearly focused on solving one of the hardest problems in adopting agentic code generation: making it usable in real organizational settings. The platform simplfies experimentation while acknowledging the realities of large, context-heavy codebases.",
    name: "Pavan Venkatesan",
    title: "VP of Engineering / Moniepoint",
    image: "/images/pavan.jpeg"
  }
];