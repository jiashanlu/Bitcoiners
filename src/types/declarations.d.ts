declare module "react";
declare module "@chakra-ui/react";
declare module "react-icons/*";
declare module "react/jsx-runtime";
declare module "react-query";

declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}
