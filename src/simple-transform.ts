export type SimpleTransform = {
    transform(): void;
};

/*

Rules for simple transforms
 - Cannot see file paths (enables easy chaining)
 - Receive string / buffer
 - Can change file names
 - 
*/

interface TextTransformSettings {

}
