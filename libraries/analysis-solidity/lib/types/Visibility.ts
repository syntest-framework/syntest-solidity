/*
 * Copyright 2020-2023 Delft University of Technology and SynTest contributors
 *
 * This file is part of SynTest Framework - SynTest Solidity.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export enum Visibility {
  Public = "public",
  Private = "private",
  Internal = "internal",
  External = "external",
}

export function getVisibility(visibility: string): Visibility {
  switch (visibility) {
    case Visibility.Public: {
      return Visibility.Public;
    }
    case Visibility.Private: {
      return Visibility.Private;
    }
    case Visibility.Internal: {
      return Visibility.Internal;
    }
    case Visibility.External: {
      return Visibility.External;
    }
    // No default
  }
  throw new Error("Invalid visibility");
}