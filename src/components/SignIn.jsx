import React, { useState, useEffect } from 'react';
import { MdOutlineCancel } from 'react-icons/md';
import { getAuthClient } from '../utils/auth';

import { Button } from '.';
import { useStateContext } from '../contexts/ContextProvider';

const auth = getAuthClient();

const SignIn = () => {
  const { loggedIn, setLoggedIn, setIsClicked, initialState } = useStateContext();

  const [isSubmitting, setSubmitting] = useState(false);

  const [result, setResult] = useState({
    authenticated: null,
    message: '',
  });

  const defaultValues = { name: '', pass: '' };
  const [values, setValues] = useState(defaultValues);

  // Only need to do this on first mount.
  useEffect(() => {
    auth.isLoggedIn().then(() => {
      setLoggedIn(true);
    }).catch((e) => {
      // console.log(e);
    });
  }, []);

  const handleInputChange = (event) => {
    const { name, value } = event.target;
    setValues({ ...values, [name]: value });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSubmitting(true);

    auth.login(values.name, values.pass)
    .then((authenticated) => {
      if (authenticated) {
        setLoggedIn(true);
        setResult({ authenticated: true, message: 'Login success' });
        console.log('logged in');

        setIsClicked(initialState);
      } else {
        setLoggedIn(false);
        setResult({ authenticated: false, message: 'Username and password error' });
        console.log('Authentication error');
      }
    });
  };

  // if (loggedIn) {
  //   console.log(`Login error: ${loggedIn}`);
  //   return (
  //     <div>
  //       <p>You're currently logged in.</p>
  //       <button onClick={() => auth.logout().then(setLoggedIn(false))}>
  //         Logout
  //       </button>
  //     </div>
  //   );
  // }

  // if (isSubmitting) {
  //   return (
  //     <div>
  //       <p>Logging in, hold tight ...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="nav-item absolute right-1 top-16 bg-white dark:bg-[#42464D] p-8 rounded-lg w-96">
      <div className="flex justify-between items-center">
        <p className="font-semibold text-lg dark:text-gray-200">Sign in</p>
        <Button
          icon={<MdOutlineCancel/>}
          color="rgb(153, 171, 180)"
          bgHoverColor="light-gray"
          size="2xl"
          borderRadius="50%"
        />
      </div>
      <div
        className="flex gap-5 border-b-1 border-color p-4 hover:bg-light-gray cursor-pointer dark:hover:bg-[#42464D]"
      >
        <div>
          <div>
            {result.message}
          </div>
          <form onSubmit={handleSubmit}>
            <input
              name="name"
              type="text"
              value={values.name}
              placeholder="Username"
              onChange={handleInputChange}
            />
            <br/>
            <input
              name="pass"
              type="text"
              value={values.pass}
              placeholder="Password"
              onChange={handleInputChange}
            />
            <br/>
            <input
              name="submit"
              type="submit"
              value="Login"
            />
          </form>
        </div>
      </div>
      <div className="mt-5"/>
    </div>
  );
};

export default SignIn;
