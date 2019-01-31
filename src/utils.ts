
export function cmp(a: string, b: string) {
    return a === b ? 0 :
        a > b ? -1 :
        1;
}

export function assertNever(value: never, why: string) {
    throw new Error(why);
}